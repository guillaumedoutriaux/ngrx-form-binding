export interface NgrxFormState<T> {
  value: T;
  errors?: { [fieldName: string]: string };
  pristine?: boolean;
  valid?: boolean;
}

export interface UpdateFormPayload<T> {
  feature: string;
  path: string;
  form: NgrxFormState<T>;
}
