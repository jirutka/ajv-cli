// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2023 Gabriel McAdams <https://github.com/ghmcadams>

// Based on https://github.com/ghmcadams/vscode-lintlens/blob/simple-ajv-errors%401.0.1/packages/simple-ajv-errors/src/types.ts
// See https://github.com/ghmcadams/vscode-lintlens/issues/77

import type { ErrorObject } from 'ajv';
import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';


export type JSONSchemaType = | string | number | boolean | JSONSchemaObject | JSONSchemaArray | null;
export interface JSONSchemaObject {
    [key: string]: JSONSchemaType;
}
export interface JSONSchemaArray extends Array<JSONSchemaType> {}


export type SparseArray<T> = (T | undefined)[];
export type Schema = JSONSchema4 | JSONSchema6 | JSONSchema7;
export type SchemaArray = JSONSchema4[] | JSONSchema6[] | JSONSchema7[];

export type VerboseErrorObject<TData = JSONSchemaType, TSchema = Schema | Schema[]> = Omit<ErrorObject, 'data' | 'schema'> & {
    schema: TSchema;
    data: TData;
};

export type OfErrorObject<TData = JSONSchemaType> = VerboseErrorObject<TData, Schema[]> & {
    choices: SparseArray<AnyError<TData>[]>;
};
export type AnyError<TData = JSONSchemaType> = VerboseErrorObject<TData> | OfErrorObject<TData>;

export type OfErrorObjectForObject = OfErrorObject<Record<string, any>>;
export type OfErrorObjectForArray = OfErrorObject<JSONSchemaType[]>;

export type OfErrorObjectWithPath<TData = JSONSchemaType> = VerboseErrorObject<TData, Schema[]> & {
    ofPaths: AnyError[][];
};
