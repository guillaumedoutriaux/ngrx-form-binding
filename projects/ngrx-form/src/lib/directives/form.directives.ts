import { Directive, Input, Inject, ChangeDetectorRef } from '@angular/core';
import {
  FormGroupDirective,
  FormGroup,
  FormControl,
  FormBuilder,
  FormArray
} from '@angular/forms';
import { Store, select } from '@ngrx/store';
import {
  debounceTime,
  takeUntil,
  filter,
  withLatestFrom,
  tap
} from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';

import { NGRX_FORMS_FEATURE } from '../services/form.tokens';
import { NgrxFormState } from '../models/form.models';
import * as fromAction from '../+store/form.actions';

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
    private fb: FormBuilder,
    private store: Store<any>,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subscriptions();
    this.storeToForm();
    this.formToStore();
  }

  private subscriptions() {
    this.formChanges$ = this.formGroupDirective.form.valueChanges.pipe(
      debounceTime(400)
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
        tap((formObject: NgrxFormState<any>) => {
          this.updateForm(formObject, this.formGroupDirective.form);
          this.formGroupDirective.form.patchValue(formObject);
          this.cd.markForCheck();
        }),
        takeUntil(this.componentDestroy$)
      )
      .subscribe();
  }

  private updateForm(formDatas, formObject: FormGroup) {
    Object.keys(formDatas).map(key => {
      const values = formDatas[key];

      // FormArray
      if (values instanceof Array) {
        formObject.setControl(key, this.rebuildArraysInForm(values));

        // FormGroup
      } else if (values instanceof Object) {
        const currentFormLayer = formObject.get(key) as FormGroup;
        this.updateForm(values, currentFormLayer);
      }
    });
  }

  private rebuildArraysInForm(values): FormArray {
    if (values[0] instanceof Object) {
      // array of objects -> [{}, {}, {}]
      const newFormArray = this.fb.array([]);

      values.map(object => {
        const newFormObject = this.fb.group({});
        Object.keys(object).map(subkey => {
          const subObjectValue = object[subkey];
          if (subObjectValue instanceof Array) {
            newFormObject.addControl(
              subkey,
              this.rebuildArraysInForm(subObjectValue)
            );
          } else {
            newFormObject.addControl(subkey, this.fb.control(subObjectValue));
          }
        });
        newFormArray.push(newFormObject);
      });

      return newFormArray;
    } else {
      // array of values -> [false, true, false]
      return this.fb.array(values);
    }
  }

  private formToStore() {
    this.formChanges$
      .pipe(
        withLatestFrom(this.storeDatas$),
        filter(([formDatas, storeDatas]) =>
          this.isDifferent(formDatas, storeDatas)
        ),
        tap(([formDatas, storeDatas]) =>
          this.store.dispatch(
            fromAction.updateform({
              payload: {
                feature: this.featureName,
                path: this.path,
                form: {
                  value: formDatas,
                  errors: this.getErrors(this.formGroupDirective.form),
                  pristine: this.formGroupDirective.pristine,
                  valid: this.formGroupDirective.valid
                }
              }
            })
          )
        ),
        takeUntil(this.componentDestroy$)
      )
      .subscribe();
  }

  private isDifferent(a, b): boolean {
    return JSON.stringify(a) !== JSON.stringify(b);
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
