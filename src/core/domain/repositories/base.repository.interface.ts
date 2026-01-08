export interface FindOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  where?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<PaginatedResult<T>>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
