import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Schema TypeORM para a tabela emociograma_categories
 *
 * Representa as categorias predefinidas de emoções que os usuários
 * podem selecionar ao submeter seu estado emocional.
 */
@Entity('emociograma_categories')
@Index(['slug'], { unique: true })
@Index(['displayOrder'])
@Index(['isActive'])
export class EmociogramaCategorySchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'integer', name: 'display_order' })
  displayOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
