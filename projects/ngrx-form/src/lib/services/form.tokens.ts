import { InjectionToken } from '@angular/core';
import { ActionReducerMap } from '@ngrx/store';

export const NGRX_FORMS_FEATURE = new InjectionToken<string>('Feature Name');
export const FEATURE_REDUCER_TOKEN = new InjectionToken<ActionReducerMap<any>>(
  'Feature Reducers'
);
