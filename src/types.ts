export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  definitions?: Record<string, JsonSchema>;
  $ref?: string;
  enum?: any[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface SchemaNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  children?: SchemaNode[];
  schema: JsonSchema;
}
