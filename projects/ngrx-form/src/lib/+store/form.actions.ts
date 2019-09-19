import { createAction, props } from '@ngrx/store';
import * as fromModel from '../models';

export const updateform = createAction(
  '[NgrxForm] Update Form',
  props<{ payload: fromModel.UpdateFormPayload<any> }>()
);

// Legacy syntax, just kept to avoid breaking changes
//
import { Action } from '@ngrx/store';
export const enum NgrxFormActionTypes {
  UPDATE_FORM = '[NgrxForm] Update Form'
}
export class Updateform implements Action {
  readonly type = NgrxFormActionTypes.UPDATE_FORM;
  constructor(public payload: fromModel.UpdateFormPayload<any>) {}
}
export type UpdateFormActions = Updateform;
