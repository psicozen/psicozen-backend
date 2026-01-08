export abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial?: Partial<BaseEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  markAsDeleted(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  touch(): void {
    this.updatedAt = new Date();
  }
}
