import type { ParsedArgs } from 'minimist'

import type { Command, CmdName } from '../types.js'

const cmd: Command = {
  execute,
  schema: {
    type: 'object',
    properties: {
      _: { maxItems: 2 },
    },
  },
}

export default cmd

export function usage(): void {
  console.error(`
usage:
  validate:  ajv [validate] -s schema.json -d data.json
  compile:   ajv compile -s schema.json

    help:      ajv help
               ajv help <command>`)
}

const commands: { [Name in CmdName]: () => void } = {
  help: mainHelp,
  compile: helpCompile,
  validate: helpValidate,
}

// eslint-disable-next-line @typescript-eslint/require-await
async function execute(argv: ParsedArgs): Promise<boolean> {
  const command = argv._[1]
  if (!command) {
    mainHelp()
    return true
  }

  if (command in commands) {
    commands[command as CmdName]()
    return true
  }

  console.error('Unknown command', command)
  usage()
  return false
}

function mainHelp(): void {
  _helpValidate()
  _helpCompile()
  schemaSpecOption()
  console.log(`
More information:
        ajv help validate
        ajv help compile
        ajv help test`)
}

function schemaSpecOption(): void {
  console.log(`
options:
    --spec=            JSON schema specification to use
            draft7     JSON Schema draft-07 (default)
            draft2019  JSON Schema draft-2019-09`)
}

function helpValidate(): void {
  _helpValidate()
  console.log(`
parameters
    -s JSON schema to validate against (required, only one schema allowed)
    -d data file(s) to be validated (required)
    -r referenced schema(s)
    -m meta schema(s)
    -c custom keywords/formats definitions

    -d, -r, -m, -c can be globs and can be used multiple times
    glob should be enclosed in double quotes
    -c module(s) should export a function that accepts Ajv instance as parameter
    (file path should start with ".", otherwise used as require package)
    .json extension can be omitted (but should be used in globs)`)
  schemaSpecOption()
  console.log(`
    --errors=          error reporting format ("js" by default)
    --changes=         log changes in data after validation ("no" by default)
             js        JavaScript object
             json      JSON format
             line      JSON single line
             text      text message (only for --errors option)
             no        don't log errors`)
  helpAjvOptions()
}

function _helpValidate(): void {
  console.log(`
Validate data file(s) against schema
    ajv [validate] -s schema.json -d data.json
    ajv [validate] -s schema.json -d "data*.json"`)
}

function helpCompile(): void {
  _helpCompile()
  console.log(`
parameters
    -s JSON schema to validate against (required)
    -r referenced schema(s)
    -m meta schema(s)
    -c custom keywords/formats definitions
    -o output file for compiled validation function

    -s, -r, -m, -c can be globs and can be used multiple times
    With option -o multiple schemas will be exported using $ids as export names
    Glob should be enclosed in double quotes
    -c module(s) should export a function that accepts Ajv instance as parameter
    (file path should start with ".", otherwise used as require package)
    .json extension can be omitted (but should be used in globs)`)
  schemaSpecOption()
  helpAjvOptions()
}

function _helpCompile(): void {
  console.log(`
Compile schema(s)
    ajv compile -s schema.json
    ajv compile -s "schema*.json"`)
}

function helpAjvOptions(): void {
  console.log(`
Ajv strict mode options:

  --allow-matching-properties
      Allow overlap between "properties" and "patternProperties". Does not
      affect other strict mode restrictions.

  --allow-union-types
      Allow using multiple non-null types in "type" keyword (one of
      --strict-types restrictions).

  --strict <bool | "log">
      Strict mode:
      * true       Throw an exception when any strict mode restriction is
                   violated.
      * log        Log warning when any strict mode restriction is violated.
      * false      Ignore all strict mode violations.
      * (default)  Use defaults for all --strict-* options.

  --strict-numbers <bool>
      Whether to accept NaN and Infinity as number types during validation:
      * true   Fail validation if NaN or Infinity is passed where number is
               expected  (default).
      * false  Allow NaN and Infinity as number.

  --strict-required <bool | "log">
      See https://ajv.js.org/strict-mode.html#defined-required-properties
      * true   Throw an exception when strict required restriction is violated.
      * log    Log warning when strict required restriction is violated.
      * false  Ignore strict required violations (default).

  --strict-schema <bool | "log">
      Prevent unknown keywords, formats etc.
      * true   Throw an exception when any strict schema restriction is
               violated (default).
      * log    Log warning when any strict schema restriction is violated.
      * false  Ignore all strict schema violations.

  --strict-tuples <bool | "log">
      See https://ajv.js.org/strict-mode.html#unconstrained-tuples.
      * true   Throw an exception when any strict tuples restriction is
               violated.
      * log    Log warning when any strict tuples restriction is violated
               (default).
      * false  Ignore all strict tuples violations.

  --strict-types <bool | "log">
      See https://ajv.js.org/strict-mode.html#strict-types. Option values:
      * true   Throw an exception when any strict types restriction is violated.
      * log    Log warning when any strict types restriction is violated
               (default).
      * false  Ignore all strict types violations.

  --validate-formats <bool>
      Disable format validation. In strict mode, unknown formats will throw
      exception during schema compilation.

Ajv validation and reporting options:

  --all-errors
      Check all rules collecting all errors. Default is to return after the
      first error.

  --comment
      Log schema "$comment"s.

  --data
      Use $data references.

  --verbose
      Include the reference to the part of the schema ("schema" and
      "parentSchema") and validated data in errors (false by default).

Ajv options to modify validated data:

  --coerce-types <bool | "array">
      Change data type of data to match type keyword:
      * false  No type coercion (default).
      * true   Coerce scalar data types.
      * array  In addition to coercions between scalar types, coerce scalar data
               to an array with one element and vice versa (as required by the
               schema).

  --remove-additional <bool | "failing">
      Remove additional properties:
      * false    Not to remove additional properties (default).
      * all      All additional properties are removed, regardless of
                 "additionalProperties" keyword in schema (and no validation is
                 made for them).
      * true     Only additional properties with "additionalProperties" keyword
                 equal to false are removed.
      * failing  Additional properties that fail schema validation will be
                 removed (where "additionalProperties" keyword is false or
                 schema).

  --use-defaults <bool | "empty">
      Replace missing or undefined properties and items with the values from
      corresponding default keywords:
      * false  Do not use defaults (default).
      * true   Insert defaults by value (object literal is used).
      * empty  In addition to missing or undefined, use defaults for properties
               and items that are equal to null or "" (an empty string).

Ajv advanced options:

  --code-es5
      Generate ES5 code.

  --code-lines
      Add line-breaks to code - to simplify debugging of generated functions.

  --code-optimize <false | int>
      Code optimization flag or number of passes, 1 pass by default.

  --inline-refs <bool | int>
      Compilation mode for referenced schemas:
      * true   Inline $ref code when possible.
      * false  Always compile $ref as a function call.
      * <int>  Inline $ref code up to this number of keywords.

  --loop-required <int>
      Pass integer to set a different number of properties above which required
      keyword will be validated in a loop.

  --loop-enum <int>
      Pass integer to set the number of values above which enum keyword will be
      validated in a loop.

  --messages <bool>
      Whether to include text messages in errors (default is true).

  --multiple-of-precision <int>
      If you need to use fractional dividers for validating "multipleOf"
      keywords, set this to some positive integer.

  --own-properties
      Only validate own properties (not relevant for JSON, but can have effect
      for JavaScript objects).

See https://github.com/epoberezkin/ajv#options for more information.`)
}
