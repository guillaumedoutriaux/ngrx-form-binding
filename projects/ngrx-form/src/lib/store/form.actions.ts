import { Action } from '@ngrx/store';
import * as fromModel from '../models';

export const enum NgrxFormActionTypes {
  UPDATE_FORM = '[NgrxForm] Update Form'
}

export class Updateform implements Action {
  readonly type = NgrxFormActionTypes.UPDATE_FORM;
  constructor(public payload: fromModel.UpdateFormPayload<any>) {}
}

// Action types
export type UpdateFormActions = Updateform;
