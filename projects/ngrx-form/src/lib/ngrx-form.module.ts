import { NgModule, ModuleWithProviders } from '@angular/core';

import { NgrxFormDirective } from './directives/form.directives';
import { NGRX_FORMS_FEATURE } from './services/form.tokens';

@NgModule({
  declarations: [NgrxFormDirective],
  exports: [NgrxFormDirective],
  imports: []
})
export class NgrxFormModule {
  static forFeature(feature: string): ModuleWithProviders<any> {
    return {
      ngModule: NgrxFormModule,
      providers: [
        {
          provide: NGRX_FORMS_FEATURE,
          useValue: feature
        }
      ]
    };
  }
}
