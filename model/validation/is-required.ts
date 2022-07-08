import { Validator } from './validator';

export function isRequired(): Validator {
  return {
    key: 'required',
    validate(value) {
      return !!value;
    },
  };
}
