#!/usr/bin/env node

/**
 * Gemini Code Review Script (Google Generative AI)
 * Analisa PRs e retorna um score de 0-100 com feedback objetivo
 */

import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Usar fetch nativo ou importar node-fetch se necessário
// Em Node 20+ fetch é nativo
const fetch = globalThis.fetch;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const GEMINI_MODEL = 'gemini-2.5-flash'; // Stable production model (updated 2026-01)

// Variáveis de repositório podem vir de GITHUB_REPOSITORY (owner/repo) ou variáveis explícitas
const [envRepoOwner, envRepoName] = (process.env.GITHUB_REPOSITORY || '').split('/');
const REPO_OWNER = process.env.REPO_OWNER || envRepoOwner;
const REPO_NAME = process.env.REPO_NAME || envRepoName;

/**
 * Validação de variáveis de ambiente
 */
function validateEnvironment() {
  const missingVars = [];
  if (!GEMINI_API_KEY) missingVars.push('GEMINI_API_KEY');
  if (!GITHUB_TOKEN) missingVars.push('GITHUB_TOKEN');
  if (!PR_NUMBER) missingVars.push('PR_NUMBER');
  if (!REPO_OWNER) missingVars.push('REPO_OWNER/GITHUB_REPOSITORY');
  if (!REPO_NAME) missingVars.push('REPO_NAME/GITHUB_REPOSITORY');

  if (missingVars.length > 0) {
    console.error(`❌ Configuração de ambiente inválida. Faltando: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  const prNum = parseInt(PR_NUMBER, 10);
  if (isNaN(prNum) || prNum <= 0) {
    console.error('❌ PR_NUMBER inválido');
    process.exit(1);
  }
}

validateEnvironment();

/**
 * Sanitiza mensagens de erro para remover potenciais secrets
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'Erro desconhecido';
  }

  let sanitized = message;
  sanitized = sanitized.replace(/AIzaSy[a-zA-Z0-9_-]+/g, '[GEMINI_API_KEY_REDACTED]');
  sanitized = sanitized.replace(/gh[psor]_[a-zA-Z0-9_-]+/g, '[GITHUB_TOKEN_REDACTED]');
  sanitized = sanitized.replace(/github_pat_[a-zA-Z0-9_-]+/g, '[GITHUB_TOKEN_REDACTED]');
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, 'Bearer [TOKEN_REDACTED]');

  if (GEMINI_API_KEY && sanitized.includes(GEMINI_API_KEY)) {
    sanitized = sanitized.split(GEMINI_API_KEY).join('[GEMINI_API_KEY_REDACTED]');
  }
  if (GITHUB_TOKEN && sanitized.includes(GITHUB_TOKEN)) {
    sanitized = sanitized.split(GITHUB_TOKEN).join('[GITHUB_TOKEN_REDACTED]');
  }

  return sanitized;
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Busca o diff do PR via GitHub API
 */
async function getPRDiff() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3.diff',
    },
  });

  if (!response.ok) {
    console.error(`❌ Falha ao buscar PR diff: ${response.status} ${response.statusText}`);
    throw new Error('Falha ao buscar dados do PR');
  }

  return await response.text();
}

/**
 * Busca informações do PR via GitHub API
 */
async function getPRInfo() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    console.error('❌ Falha ao buscar info do PR');
    throw new Error('Falha ao buscar dados do PR');
  }

  return await response.json();
}

/**
 * Parseia o diff para estrutura
 */
function parseDiffToStructure(diff) {
  const files = [];
  const lines = diff.split('\n');

  let currentFile = null;
  let currentLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentFile = {
          filename: match[2],
          changes: []
        };
        files.push(currentFile);
      }
      continue;
    }

    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (match) {
        currentLineNumber = parseInt(match[1], 10);
      }
      continue;
    }

    if (currentFile && line.length > 0) {
      const firstChar = line[0];

      if (firstChar === '+' && !line.startsWith('+++')) {
        currentFile.changes.push({
          lineNumber: currentLineNumber,
          type: 'addition',
          content: line.substring(1)
        });
        currentLineNumber++;
      } else if (firstChar === '-' && !line.startsWith('---')) {
        currentFile.changes.push({
          lineNumber: currentLineNumber - 1,
          type: 'deletion',
          content: line.substring(1)
        });
      } else if (firstChar === ' ') {
        currentLineNumber++;
      }
    }
  }

  return files;
}

/**
 * Analisa código usando Gemini
 */
async function analyzeCode(diff, prInfo, parsedDiff) {
  const filesContext = parsedDiff.map(file => {
    const addedLines = file.changes.filter(c => c.type === 'addition').length;
    const deletedLines = file.changes.filter(c => c.type === 'deletion').length;
    return `- ${file.filename} (+${addedLines}/-${deletedLines} linhas)`;
  }).join('\n');

  // Ajuste de caminho. Se rodando na raiz do repo, pode ser scripts-ai-reviewer/review-prompt.txt
  // ou .github/scripts/review-prompt.txt dependendo de onde o user colocou.
  // Vou tentar ler do diretório atual ou de .github/scripts.
  let promptPath = 'scripts-ai-reviewer/review-prompt.txt';
  if (!fs.existsSync(promptPath)) {
    promptPath = '.github/scripts/review-prompt.txt';
  }
  if (!fs.existsSync(promptPath)) {
     // Fallback para mesmo diretório do script
     promptPath = new URL('./review-prompt.txt', import.meta.url).pathname;
  }

  // Se ainda assim não achar, erro.
  // Mas como o user disse que está em scripts-ai-reviewer, vou assumir relativo a execução se não achar.
  let promptTemplate;
  try {
     promptTemplate = fs.readFileSync(promptPath, 'utf-8');
  } catch(e) {
     // Fallback simples se não achar o arquivo
     console.warn("⚠️ Arquivo review-prompt.txt não encontrado, usando path relativo simples.");
     promptTemplate = fs.readFileSync('review-prompt.txt', 'utf-8');
  }

  const prompt = promptTemplate
    .replace('{{PR_TITLE}}', prInfo.title)
    .replace('{{PR_DESCRIPTION}}', prInfo.body || 'Sem descrição')
    .replace('{{FILES_CONTEXT}}', filesContext)
    .replace('{{DIFF}}', diff);


  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    const analysis = JSON.parse(responseText);

    if (typeof analysis.score !== 'number' ||
        typeof analysis.summary !== 'string' ||
        !Array.isArray(analysis.issues)) {
      throw new Error('Estrutura JSON inválida: campos obrigatórios ausentes');
    }

    return analysis;

  } catch (error) {
    console.error('❌ Falha ao processar resposta do Gemini');
    throw error;
  }
}

function isLineInDiff(parsedDiff, filename, lineNumber) {
  const file = parsedDiff.find(f => f.filename === filename);
  if (!file) return false;

  return file.changes.some(change => {
    if (change.type === 'addition') {
      return change.lineNumber === lineNumber;
    }
    return false;
  });
}

async function postReviewWithComments(analysis, prInfo, parsedDiff) {
  const { score, summary, positives, issues } = analysis;

  if (!issues || issues.length === 0) {

    const reviewBody = `<div style="display: flex; align-items: center;"><span style="font-size: 50px;">🤖</span> <h2 style="margin: 0 0 0 10px;">Code Review - Gemini AI</h2></div>

**Score: ${score}/100** ✅ Aprovado

### 📋 Resumo
${summary}

${positives && positives.length > 0 ? `### ✅ Pontos Positivos\n${positives.map(p => `- ${p}`).join('\n')}` : ''}

---
*Revisão automática gerada por Gemini AI*`;

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/reviews`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commit_id: prInfo.head.sha,
        body: reviewBody,
        event: 'COMMENT'
      }),
    });

    if (!response.ok) {
        throw new Error(`Erro ao postar review de aprovação: ${await response.text()}`);
    }
    return;
  }


  const comments = [];
  for (const issue of issues) {
    if (!isLineInDiff(parsedDiff, issue.file, issue.line)) {
      console.warn(`  ⚠️ Linha ${issue.line} não encontrada no diff de ${issue.file} - pulando comentário`);
      continue;
    }

    const severityEmoji = { error: '🔴', warning: '⚠️', info: 'ℹ️' }[issue.severity] || '📌';
    const typeLabel = issue.type || 'Geral';

    const commentBody = `${severityEmoji} **${typeLabel}**\n\n**${issue.message}**\n\n**Por que isso é um problema:**\n${issue.explanation}\n\n**Sugestão:**\n${issue.suggestion}`;

    comments.push({
      path: issue.file,
      line: issue.line,
      side: 'RIGHT',
      body: commentBody
    });
  }

  const statusEmoji = score >= 70 ? '✅' : '❌';
  const statusText = score >= 70 ? 'Aprovado' : 'Necessita Ajustes';

  let reviewBody = `<div style="display: flex; align-items: center;"><span style="font-size: 50px;">🤖</span> <h2 style="margin: 0 0 0 10px;">Code Review - Gemini AI</h2></div>

**Score: ${score}/100** ${statusEmoji} ${statusText}

### 📋 Resumo
${summary}`;

  if (positives && positives.length > 0) {
    reviewBody += `\n\n### ✅ Pontos Positivos\n`;
    positives.forEach(p => reviewBody += `- ${p}\n`);
  }

  if (issues.length > 0) {
    reviewBody += `\n\n### 🔍 Issues Encontradas (${issues.length})\n\n`;
    reviewBody += `| Severidade | Localização | Tipo | Problema |\n|---|---|---|---|\n`;

    issues.forEach(issue => {
        const sev = { error: '🔴', warning: '⚠️', info: 'ℹ️' }[issue.severity] || '📌';
        reviewBody += `| ${sev} ${issue.severity} | \`${issue.file}:${issue.line}\` | ${issue.type} | ${issue.message} |\n`;
    });

    reviewBody += `\n💡 **Nota:** Comentários detalhados foram postados inline.\n`;
  }

  reviewBody += `\n\n---\n*Revisão automática gerada por Gemini AI*`;

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/reviews`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commit_id: prInfo.head.sha,
      body: reviewBody,
      event: 'COMMENT',
      comments: comments
    }),
  });

  if (!response.ok) {
     throw new Error(`Erro ao postar review: ${await response.text()}`);
  }
}

async function main() {
  try {

    const [diff, prInfo] = await Promise.all([
      getPRDiff(),
      getPRInfo(),
    ]);


    const parsedDiff = parseDiffToStructure(diff);

    const analysis = await analyzeCode(diff, prInfo, parsedDiff);


    await postReviewWithComments(analysis, prInfo, parsedDiff);

    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
      fs.appendFileSync(githubOutput, `score=${analysis.score}\n`);
      fs.appendFileSync(githubOutput, `status=${analysis.score >= 70 ? 'approved' : 'rejected'}\n`);
    }

    if (analysis.score < 70) {
        process.exit(1);
    } else {
        process.exit(0);
    }

  } catch (error) {
    console.error('❌ Erro:', sanitizeErrorMessage(error?.message || String(error)));
    process.exit(1);
  }
}

main();
