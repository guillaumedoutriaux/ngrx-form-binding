import {
  Directive,
  Input,
  Inject,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import {
  FormGroupDirective,
  FormGroup,
  FormControl,
  FormBuilder,
  FormArray,
} from '@angular/forms';
import { Store, select } from '@ngrx/store';
import {
  debounceTime,
  takeUntil,
  filter,
  withLatestFrom,
  tap,
} from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';

import { NGRX_FORMS_FEATURE } from '../services/form.tokens';
import { NgrxFormState } from '../models/form.models';
import * as fromAction from '../+store/form.actions';
import { isPlatformBrowser } from '@angular/common';
import { platformBrowser } from '@angular/platform-browser';

@Directive({
  selector: '[NgrxFormConnect]',
})
export class NgrxFormDirective {
  @Input('NgrxFormConnect') path!: string;

  private componentDestroy$ = new Subject<boolean>();
  private formChanges$!: Observable<FormGroup>;
  private storeDatas$!: Observable<NgrxFormState<any>>;

  constructor(
    @Inject(NGRX_FORMS_FEATURE) public featureName: string,
    @Inject(PLATFORM_ID) private platformId: string,
    private formGroupDirective: FormGroupDirective,
    private fb: FormBuilder,
    private store: Store<any>,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.subscriptions();
      this.storeToForm();
      this.formToStore();
    }
  }

  private subscriptions() {
    this.formChanges$ = this.formGroupDirective.form.valueChanges.pipe(
      debounceTime(400)
    );
    this.storeDatas$ = this.store.pipe(
      // select((data: NgrxFormState<any>) => {
      select((data: any) => {
        const featureName = this.featureName;
        const feature = data[featureName];

        return feature[this.path].value as any;
      })
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

  private updateForm(formDatas: any, formObject: FormGroup) {
    Object.keys(formDatas).map((key) => {
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

  private rebuildArraysInForm(values: any): FormArray {
    if (values[0] instanceof Object) {
      // array of objects -> [{}, {}, {}]
      const newFormArray: any = this.fb.array([]);

      values.map((object: any) => {
        const newFormObject = this.fb.group({});
        Object.keys(object).map((subkey) => {
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
                  pristine: this.formGroupDirective.pristine as
                    | boolean
                    | undefined,
                  valid: this.formGroupDirective.valid as boolean | undefined,
                },
              },
            })
          )
        ),
        takeUntil(this.componentDestroy$)
      )
      .subscribe();
  }

  private isDifferent(a: any, b: any): boolean {
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  private getErrors(formGroup: FormGroup): any {
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
    this.componentDestroy$.next(true);
    this.componentDestroy$.complete();
  }
}
