export interface NgrxFormState<T> {
  value: T;
  errors?: { [fieldName: string]: string };
  pristine?: Boolean;
  valid?: Boolean;
}

export interface UpdateFormPayload<T> {
  feature: string;
  path: string;
  form: NgrxFormState<T>;
}
