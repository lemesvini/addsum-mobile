/**
 * Same behavior as rxdb/plugins/validate-ajv, but Ajv is configured with
 * allowUnionTypes so JSON Schema unions like type: ["string", "object"]
 * compile (RxDB's bundled plugin uses strict defaults that reject those).
 * Only used in __DEV__ mode.
 */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  wrappedValidateStorageFactory,
  type RxDocumentData,
  type RxJsonSchema,
} from "rxdb";

let ajv: InstanceType<typeof Ajv> | undefined;

function getAjv(): InstanceType<typeof Ajv> {
  if (!ajv) {
    ajv = new Ajv({
      strict: true,
      allowUnionTypes: true,
    });
    ajv.addKeyword("version");
    ajv.addKeyword("keyCompression");
    ajv.addKeyword("primaryKey");
    ajv.addKeyword("indexes");
    ajv.addKeyword("encrypted");
    ajv.addKeyword("final");
    ajv.addKeyword("sharding");
    ajv.addKeyword("internalIndexes");
    ajv.addKeyword("attachments");
    ajv.addKeyword("ref");
    ajv.addKeyword("crdt");
    addFormats(ajv as any);
  }
  return ajv;
}

function getValidator(schema: RxJsonSchema<any>) {
  const validator = getAjv().compile(schema);
  return (docData: RxDocumentData<any>) => {
    if (validator(docData)) return [];
    return validator.errors as any;
  };
}

export const wrappedValidateAjvStorageAllowUnion = wrappedValidateStorageFactory(
  getValidator,
  "ajv-allow-union",
);
