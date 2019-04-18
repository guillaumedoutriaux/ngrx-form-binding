import { ActionReducerMap, Action } from '@ngrx/store';
import { NgrxFormState } from '../models';
import * as fromActions from './form.actions';

export function getInitialState(formContent = {}): NgrxFormState<any> {
  return {
    value: formContent,
    errors: {},
    pristine: true,
    valid: false
  };
}

export function NgrxFormReducer(forms: Array<string>): ActionReducerMap<any> {
  return forms.reduce((results, key) => {
    return {
      ...results,
      [key]: (state = getInitialState(), action: Action) => state
    };
  }, {});
}

export function ngrxForm(reducer: Function) {
  return function(state: any, action: fromActions.Updateform) {
    if (action.type == fromActions.NgrxFormActionTypes.UPDATE_FORM) {
      const { feature, path, form } = action.payload;
      state = {
        ...state,
        [feature]: {
          ...state[feature],
          [path]: {
            ...state[feature][path],
            ...form
          }
        }
      };
    }
    return reducer(state, action);
  };
}
