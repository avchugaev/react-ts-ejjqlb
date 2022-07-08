import * as React from 'react';
import { values, omit, set } from 'lodash/fp';
import {
  useState,
  useCallback,
  createContext,
  useContext,
  InputHTMLAttributes,
  useEffect,
  useId,
  HTMLAttributes,
  useMemo,
  FormHTMLAttributes,
} from 'react';
import './style.css';
import { Validator } from './model/validation/validator';
import { isRequired } from './model/validation/is-required';
import { validate } from './model/validation/validate';

export default function App() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const onNameSubmit = useCallback(({ firstName, lastName }: NameFormData) => {
    setName(`${firstName} ${lastName}`);
    setStep(step + 1);
  }, []);

  return (
    <div>
      {name && <h1>Hello {name}!</h1>}
      {!name && <h1>Let's get to know you better</h1>}
      {step === 0 && <NameForm submit={onNameSubmit} />}
      {step === 1 && <p>Thanks, you've completed the onboarding!</p>}
    </div>
  );
}

export interface NameFormData {
  readonly firstName: string;
  readonly lastName: string;
}

export interface NameFormProps {
  submit: (data: NameFormData) => void;
}

export function NameForm({ submit }: NameFormProps) {
  const [firstName, setFirstName] = useState('Alex');
  const [lastName, setLastName] = useState('Chugaev');

  const onSubmit = useCallback(
    (event) => {
      event.preventDefault();
      submit({ firstName, lastName });
    },
    [firstName, lastName]
  );

  return (
    <Form className="form-column" onSubmit={onSubmit}>
      <FormField>
        <label>First name</label>
        <Input
          id="first_name-input"
          name="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          validators={[isRequired()]}
        />
      </FormField>

      <FormField>
        <label>Last name</label>
        <Input
          id="last_name-input"
          name="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          validators={[isRequired()]}
        />
      </FormField>

      <button>Next</button>
    </Form>
  );
}

export interface FormGroup {
  setControl(id: string, state: ControlState): void;
  removeControl(id: string): void;
}

export const FormGroupContext = createContext<FormGroup | undefined>(undefined);

export function useFormGroup(validators: readonly Validator[] = []) {
  const [controls, setControls] = useState<Record<string, ControlState>>({});

  const valid = useMemo(() => {
    const validControls = values(controls).every(
      (control) => control.valid ?? true
    );
    // const validGroup = validators.reduce((result, validator) => {
    //   return result && validator.validate()
    // }, true)

    return validControls;
  }, [controls]);
  const touched = useMemo(
    () => values(controls).some((control) => control.touched ?? false),
    [controls]
  );

  const group: FormGroup = useMemo(
    () => ({
      setControl(id: string, state: ControlState) {
        setControls(set(id, state, controls));
      },
      removeControl(id: string) {
        setControls(omit(id, controls));
      },
    }),
    [controls]
  );

  const className = useClassName({
    valid: valid === true,
    invalid: valid === false,
    touched,
  });

  return { group, valid, touched, controls, setControls, className };
}

// Form component

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  readonly validators?: readonly Validator<Record<string, unknown>>[];
}

export function Form({ validators, ...props }: FormProps) {
  const { group, controls, className } = useFormGroup(validators);

  const _className = useClassName({
    [props.className ?? '']: true,
    form: true,
    [className]: true,
  });

  return (
    <FormGroupContext.Provider value={group}>
      <form
        {...props}
        noValidate={props.noValidate ?? true}
        className={_className}
      >
        {props.children}
      </form>
      <pre>{JSON.stringify(controls, undefined, 2)}</pre>
    </FormGroupContext.Provider>
  );
}

// FormField component

export interface FormFieldState {
  readonly setValid?: (valid: boolean | undefined) => void;
  readonly setTouched?: (touched: boolean | undefined) => void;
}

export const FormFieldContext = createContext<FormFieldState>({});

export function useFormField(id?: string) {
  const _id = useId();

  id = id ?? _id;

  const [valid, setValid] = useState<boolean | undefined>();
  const [touched, setTouched] = useState<boolean>(false);

  const className = useClassName({
    'form-field': true,
    valid: valid === true,
    invalid: valid === false,
    touched,
  });

  const state: FormFieldState = {
    setValid,
    setTouched,
  };

  return {
    id,
    valid,
    setValid,
    touched,
    setTouched,
    className,
    state,
  };
}

export function FormField(props: HTMLAttributes<HTMLDivElement>) {
  const { id, className, state } = useFormField(props.id);

  const _className = useClassName({
    [className]: true,
    [props.className ?? '']: true,
  });

  return (
    <FormFieldContext.Provider value={state}>
      <div {...props} id={id} className={_className}>
        {props.children}
      </div>
    </FormFieldContext.Provider>
  );
}

// Control abstraction

export interface ControlState<T = unknown> {
  readonly value: T;
  readonly valid?: boolean;
  readonly touched?: boolean;
}

export function useControl<T>(
  id: string | undefined,
  initialValue: T,
  validators: readonly Validator<T>[] = []
) {
  const _id = useId();

  const [value, setValue] = useState(initialValue);
  const [valid, setValid] = useState<boolean | undefined>();
  const [touched, setTouched] = useState<boolean>(false);

  const group = useContext(FormGroupContext);
  const field = useContext(FormFieldContext);

  const className = useClassName({
    valid: valid === true,
    invalid: valid === false,
    touched: touched === true,
  });

  id = id ?? _id;

  const state: ControlState<T> = {
    value,
    valid,
    touched,
  };

  useEffect(() => {
    if (validators) {
      setValid(validate(validators)(value));
    } else {
      setValid(undefined);
    }
  }, [value, validators]);

  useEffect(() => {
    field.setValid(valid);
  }, [valid]);

  useEffect(() => {
    field.setTouched(touched);
  }, [touched]);

  useEffect(() => {
    group.setControl(id, state);

    return () => {
      group.removeControl(id);
    };
  }, [valid, touched]);

  return {
    id,
    value,
    setValue,
    valid,
    setValid,
    touched,
    setTouched,
    className,
  };
}

// Input component

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly validators?: readonly Validator<
    InputHTMLAttributes<HTMLInputElement>['value']
  >[];
}

export function Input(props: InputProps) {
  const { id, value, setValue, setTouched, className } = useControl(
    props.id,
    props.value,
    props.validators
  );

  const _className = useClassName({
    [props.className ?? '']: true,
    input: true,
    [className]: true,
  });

  function onBlur(event) {
    setTouched(true);

    props.onBlur?.(event);
  }

  function onChange(event) {
    setValue(event.target.value);

    props.onChange?.(event);
  }

  return (
    <input
      {...props}
      id={id}
      className={_className}
      value={value}
      onBlur={onBlur}
      onChange={onChange}
    />
  );
}

// Classes hook

export function useClassName(names: Record<string, boolean>): string {
  return Object.keys(names)
    .reduce((acc: string[], name) => {
      if (name && names[name]) {
        return [...acc, name];
      }

      return acc;
    }, [])
    .join(' ');
}
