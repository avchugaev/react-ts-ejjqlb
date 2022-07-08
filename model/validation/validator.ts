export interface Validator<T = unknown> {
  readonly key: string;

  validate(value: T): boolean;
}
