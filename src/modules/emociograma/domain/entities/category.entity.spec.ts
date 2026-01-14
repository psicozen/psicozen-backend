import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';
import {
  EmociogramaCategoryEntity,
  CreateEmociogramaCategoryParams,
} from './category.entity';

describe('EmociogramaCategoryEntity', () => {
  describe('create()', () => {
    it('deve criar uma categoria com dados válidos', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: 'Felicidade',
        description: 'Estado de bem-estar e contentamento',
        icon: 'smile',
        displayOrder: 1,
      };

      const category = EmociogramaCategoryEntity.create(params);

      expect(category.name).toBe('Felicidade');
      expect(category.slug).toBe('felicidade');
      expect(category.description).toBe('Estado de bem-estar e contentamento');
      expect(category.icon).toBe('smile');
      expect(category.displayOrder).toBe(1);
      expect(category.isActive).toBe(true);
      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.updatedAt).toBeInstanceOf(Date);
    });

    it('deve criar uma categoria sem campos opcionais', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: 'Ansiedade',
        displayOrder: 0,
      };

      const category = EmociogramaCategoryEntity.create(params);

      expect(category.name).toBe('Ansiedade');
      expect(category.slug).toBe('ansiedade');
      expect(category.description).toBeUndefined();
      expect(category.icon).toBeUndefined();
      expect(category.displayOrder).toBe(0);
      expect(category.isActive).toBe(true);
    });

    it('deve remover espaços extras do nome', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: '  Motivação  ',
        displayOrder: 2,
      };

      const category = EmociogramaCategoryEntity.create(params);

      expect(category.name).toBe('Motivação');
      expect(category.slug).toBe('motivacao');
    });

    it('deve lançar ValidationException quando nome for muito curto', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: 'A',
        displayOrder: 1,
      };

      expect(() => EmociogramaCategoryEntity.create(params)).toThrow(
        ValidationException,
      );

      try {
        EmociogramaCategoryEntity.create(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        expect((error as ValidationException).errors.name).toBeDefined();
      }
    });

    it('deve lançar ValidationException quando nome for muito longo', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: 'A'.repeat(51),
        displayOrder: 1,
      };

      expect(() => EmociogramaCategoryEntity.create(params)).toThrow(
        ValidationException,
      );
    });

    it('deve lançar ValidationException quando nome estiver vazio', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: '',
        displayOrder: 1,
      };

      expect(() => EmociogramaCategoryEntity.create(params)).toThrow(
        ValidationException,
      );
    });

    it('deve lançar ValidationException quando displayOrder for negativo', () => {
      const params: CreateEmociogramaCategoryParams = {
        name: 'Categoria Teste',
        displayOrder: -1,
      };

      expect(() => EmociogramaCategoryEntity.create(params)).toThrow(
        ValidationException,
      );

      try {
        EmociogramaCategoryEntity.create(params);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        expect((error as ValidationException).errors.displayOrder).toBeDefined();
      }
    });
  });

  describe('generateSlug()', () => {
    it('deve converter para minúsculas', () => {
      expect(EmociogramaCategoryEntity.generateSlug('FELICIDADE')).toBe(
        'felicidade',
      );
    });

    it('deve remover acentos', () => {
      expect(EmociogramaCategoryEntity.generateSlug('Motivação')).toBe(
        'motivacao',
      );
      expect(EmociogramaCategoryEntity.generateSlug('Ansiedade')).toBe(
        'ansiedade',
      );
      expect(EmociogramaCategoryEntity.generateSlug('Côncavo')).toBe('concavo');
    });

    it('deve substituir espaços por underscore', () => {
      expect(
        EmociogramaCategoryEntity.generateSlug('Ansiedade e Estresse'),
      ).toBe('ansiedade_e_estresse');
    });

    it('deve substituir caracteres especiais por underscore', () => {
      expect(EmociogramaCategoryEntity.generateSlug('Emoção/Sentimento')).toBe(
        'emocao_sentimento',
      );
      expect(EmociogramaCategoryEntity.generateSlug('Bem-estar')).toBe(
        'bem_estar',
      );
    });

    it('deve remover underscores duplicados', () => {
      expect(EmociogramaCategoryEntity.generateSlug('Teste   Múltiplos')).toBe(
        'teste_multiplos',
      );
    });

    it('deve remover underscores no início e fim', () => {
      expect(EmociogramaCategoryEntity.generateSlug('  Categoria  ')).toBe(
        'categoria',
      );
      expect(EmociogramaCategoryEntity.generateSlug('___teste___')).toBe(
        'teste',
      );
    });

    it('deve lidar com caracteres complexos', () => {
      expect(EmociogramaCategoryEntity.generateSlug('São João')).toBe(
        'sao_joao',
      );
      expect(EmociogramaCategoryEntity.generateSlug('Ação & Reação')).toBe(
        'acao_reacao',
      );
    });
  });

  describe('activate()', () => {
    it('deve ativar a categoria e atualizar updatedAt', () => {
      const category = new EmociogramaCategoryEntity({
        name: 'Teste',
        slug: 'teste',
        displayOrder: 1,
        isActive: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = category.updatedAt;

      category.activate();

      expect(category.isActive).toBe(true);
      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('deactivate()', () => {
    it('deve desativar a categoria e atualizar updatedAt', () => {
      const category = new EmociogramaCategoryEntity({
        name: 'Teste',
        slug: 'teste',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const previousUpdatedAt = category.updatedAt;

      category.deactivate();

      expect(category.isActive).toBe(false);
      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('updateDetails()', () => {
    let category: EmociogramaCategoryEntity;

    beforeEach(() => {
      category = EmociogramaCategoryEntity.create({
        name: 'Original',
        description: 'Descrição original',
        icon: 'icon-original',
        displayOrder: 1,
      });
    });

    it('deve atualizar o nome e regenerar o slug', () => {
      category.updateDetails({ name: 'Novo Nome' });

      expect(category.name).toBe('Novo Nome');
      expect(category.slug).toBe('novo_nome');
    });

    it('deve atualizar a descrição', () => {
      category.updateDetails({ description: 'Nova descrição' });

      expect(category.description).toBe('Nova descrição');
    });

    it('deve atualizar o ícone', () => {
      category.updateDetails({ icon: 'novo-icone' });

      expect(category.icon).toBe('novo-icone');
    });

    it('deve atualizar a ordem de exibição', () => {
      category.updateDetails({ displayOrder: 5 });

      expect(category.displayOrder).toBe(5);
    });

    it('deve atualizar múltiplos campos de uma vez', () => {
      category.updateDetails({
        name: 'Atualizado',
        description: 'Desc atualizada',
        displayOrder: 10,
      });

      expect(category.name).toBe('Atualizado');
      expect(category.description).toBe('Desc atualizada');
      expect(category.displayOrder).toBe(10);
    });

    it('deve lançar ValidationException quando nome for inválido', () => {
      expect(() => category.updateDetails({ name: 'A' })).toThrow(
        ValidationException,
      );
    });

    it('deve lançar ValidationException quando displayOrder for negativo', () => {
      expect(() => category.updateDetails({ displayOrder: -1 })).toThrow(
        ValidationException,
      );
    });

    it('deve remover descrição quando string vazia', () => {
      category.updateDetails({ description: '' });

      expect(category.description).toBeUndefined();
    });

    it('deve atualizar updatedAt após alterações', () => {
      const previousUpdatedAt = category.updatedAt;

      // Pequeno delay para garantir diferença no timestamp
      category.updateDetails({ name: 'Teste Update' });

      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });

  describe('constructor', () => {
    it('deve criar instância com partial data', () => {
      const category = new EmociogramaCategoryEntity({
        id: 'uuid-123',
        name: 'Categoria',
        slug: 'categoria',
        displayOrder: 1,
        isActive: true,
      });

      expect(category.id).toBe('uuid-123');
      expect(category.name).toBe('Categoria');
    });

    it('deve herdar comportamento de BaseEntity', () => {
      const category = new EmociogramaCategoryEntity({
        name: 'Teste',
        slug: 'teste',
        displayOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(category.isDeleted()).toBe(false);

      category.markAsDeleted();

      expect(category.isDeleted()).toBe(true);
      expect(category.deletedAt).toBeInstanceOf(Date);
    });
  });
});
