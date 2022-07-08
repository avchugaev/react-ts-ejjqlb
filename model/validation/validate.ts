import { Validator } from './validator';

export function validate<T>(validators: readonly Validator<T>[]) {
  return (value: T) => {
    return validators.reduce((valid, validator) => {
      return valid && validator.validate(value);
    }, true);
  };
}
