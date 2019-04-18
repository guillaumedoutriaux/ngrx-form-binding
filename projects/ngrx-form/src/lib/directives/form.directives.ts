import { Directive, Input, Inject, ChangeDetectorRef } from '@angular/core';
import {
  FormGroupDirective,
  FormGroup,
  FormBuilder,
  FormControl
} from '@angular/forms';
import { Store, select } from '@ngrx/store';
import {
  debounceTime,
  takeUntil,
  filter,
  map,
  withLatestFrom
} from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';

import { NGRX_FORMS_FEATURE } from '../services/form.tokens';
import { NgrxFormState, UpdateFormPayload } from '../models/form.models';

import * as fromAction from '../store/form.actions';

@Directive({
  selector: '[NgrxFormConnect]'
})
export class NgrxFormDirective {
  @Input('NgrxFormConnect') path: string;

  private componentDestroy$ = new Subject<boolean>();
  private formChanges$: Observable<FormGroup>;
  private storeDatas$: Observable<NgrxFormState<any>>;

  constructor(
    @Inject(NGRX_FORMS_FEATURE) public featureName: string,
    private formGroupDirective: FormGroupDirective,
    private store: Store<any>,
    private cd: ChangeDetectorRef,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.subscriptions();
    this.storeToForm();
    this.formToStore();
  }

  private subscriptions() {
    this.formChanges$ = this.formGroupDirective.form.valueChanges.pipe(
      debounceTime(300)
    );
    this.storeDatas$ = this.store.pipe(
      select(
        (data: NgrxFormState<any>) => data[this.featureName][this.path].value
      )
    );
  }

  private storeToForm() {
    this.storeDatas$
      .pipe(
        map((formObject: NgrxFormState<any>) => {
          this.updateForm(formObject, this.formGroupDirective.form);
          this.formGroupDirective.form.patchValue(formObject);
          this.cd.markForCheck();
        }),
        takeUntil(this.componentDestroy$)
      )
      .subscribe();
  }

  private formToStore() {
    this.formChanges$
      .pipe(
        withLatestFrom(this.storeDatas$),
        filter(
          ([formDatas, storeDatas]) =>
            JSON.stringify(formDatas) !== JSON.stringify(storeDatas)
        ),
        map(([formDatas, storeDatas]) =>
          this.store.dispatch(
            new fromAction.Updateform(this.mapActionPayload(formDatas))
          )
        ),
        takeUntil(this.componentDestroy$)
      )
      .subscribe();
  }

  private mapActionPayload(formDatas: FormGroup): UpdateFormPayload<any> {
    return {
      feature: this.featureName,
      path: this.path,
      form: {
        value: formDatas,
        errors: this.getErrors(this.formGroupDirective.form),
        pristine: this.formGroupDirective.pristine,
        valid: this.formGroupDirective.valid
      }
    };
  }

  private updateForm(formDatas, formObject: FormGroup) {
    Object.keys(formDatas).map(key => {
      const values = formDatas[key];

      // FormArray
      if (values instanceof Array) {
        // The array contains FormGroup items so we need
        // to create the groups before adding them to the array
        if (values[0] instanceof Object) {
          const arrayOfControls = values.map(field => this.fb.group(field));
          formObject.setControl(key, this.fb.array(arrayOfControls));
        } else {
          formObject.setControl(key, this.fb.array(values));
        }

        // FormGroup
      } else if (values instanceof Object) {
        this.updateForm(values, formObject.get(key) as FormGroup);
      }
    });
  }

  private getErrors(formGroup: FormGroup) {
    return Object.keys(formGroup.controls).reduce((acc, key) => {
      const control = formGroup.get(key);
      acc = acc === undefined ? {} : acc;
      if (control instanceof FormControl && control.errors) {
        return { ...acc, ...{ [key]: control.errors } };
      } else if (control instanceof FormGroup) {
        return { ...acc, ...this.getErrors(control) };
      } else {
        return acc;
      }
    }, {});
  }

  ngOnDestroy() {
    this.componentDestroy$.next();
    this.componentDestroy$.complete();
  }
}
