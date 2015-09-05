"use strict";

var f = require('util').format,
  url = require('url'),
  request = require('request');

// Compilers
var Compiler = require('vitesse').Compiler
  , ClosureCompiler = require('vitesse').ClosureCompiler;

// AST classes
var NestedArrayType = require('vitesse').NestedArrayType,
  StringType = require('vitesse').StringType,
  IntegerType = require('vitesse').IntegerType,
  NumberType = require('vitesse').NumberType,
  CustomType = require('vitesse').CustomType,
  BooleanType = require('vitesse').BooleanType,
  OneOfType = require('vitesse').OneOfType,
  ArrayType = require('vitesse').ArrayType,
  AllOfType = require('vitesse').AllOfType,
  AnyOfType = require('vitesse').AnyOfType,
  EnumType = require('vitesse').EnumType,
  NotType = require('vitesse').NotType,
  AnyType = require('vitesse').AnyType,
  NullType = require('vitesse').NullType,
  RecursiveReferenceType = require('vitesse').RecursiveReferenceType,
  DocumentType = require('vitesse').DocumentType;

var clone = function(o) { var ob = {}; for(var n in o) ob[n] = o[n]; return ob; }

var JSONSchema = function() {  
}

JSONSchema.prototype.compile = function(schema, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  options = clone(options);
  // Set recursive resolution depth
  options.maxRecursiveDepth = options.maxRecursiveDepth || 1;
  // Clone the schema
  schema = JSON.parse(JSON.stringify(schema));
  // Closure compiler
  var closure = typeof options.closure == 'boolean' ? options.closure : false;
  // Compile state
  var state = new CompileState(schema, options);
  // Build the target schema
  state.buildAST(schema, function(err, ast) {
    if(err) return callback(err);
    // Compile the AST
    var compiler = new Compiler();
    var validator = compiler.compile(ast, options);
    callback(null, validator);
  });
}

var CompileState = function(schema, options) {
  this.schema = schema;
  this.options = options || {};
}

// var extractExternalReferences = function(schema, externalReferences) {
//   for(var name in schema) {
//     var value = schema[name];

//     if(name == '$ref') {
//       try {        
//         var uri = url.parse(value);
//         // We have a valid uri, go fetch it
//         externalReferences.push({uri: uri, schema: schema, url: value});
//       } catch(err) {
//         console.log(err)
//       }
//     } else if(value instanceof Object) {
//       externalReferences(value, externalReferences);
//     }
//   }
// }

// var resolveExternalReferences = function(references, callback) {
//   var left = references.length;
//   var errors = [];

//   // Grab the url
//   var executeUrl = function(reference, callback) {
//     var url = reference.url;
//     var uri = reference.uri;
//     var schema = reference.schema;

//     // Execute the request
//     request(url, function(error, response, body) {
//       if(error) return callback(error);
//       // Got the body, parse it
//       var obj = JSON.parse(body);
//       // Split the url out to locate the right place
//       var path = url.substr(url.indexOf('#'));
//       // Check the path
//       if(path == '#') {
//         // Replace the whole object
//         delete schema['$ref'];
//         for(var name in obj) {
//           schema[name] = obj[name];
//         }
//       }

//       // console.log("----------------------------------------------")
//       // console.dir(path)
//       // Return the result
//       callback();
//     });
//   }

//   // Grab all the resources
//   for(var i = 0; i < references.length; i++) {
//     executeUrl(references[i], function(err) {
//       left = left - 1;

//       // Add the error to the errors
//       if(err) errors.push(err);

//       // Finished
//       if(left == 0) {
//         callback(errors.length > 0 ? errors : undefined);
//       }
//     });
//   }
// }

var explode = function(schema, options, callback) {
  var results = [];
  var seenObjects = [];
  var externalReferences = [];
  // // Find all external references
  // extractExternalReferences(schema, externalReferences);

  // // Resolve all the external references
  // resolveExternalReferences(externalReferences, function(err) {
  //   if(err) return callback(err);

    // console.log("-----------------------------------------------------------------")
    // delete schema.properties.not
    // console.log(JSON.stringify(schema, null, 2))
    // process.exit(0)

    // Dereference the entire object
    var references = extractReferences(schema, schema, seenObjects, options);
    console.log(JSON.stringify(schema, null, 2))
    // console.log("-----------------------------------------------------------------")
    // Return the schema
    callback(null, schema);
  // });

  // console.log("###################################### located external references")
  // console.dir(externalReferences)

  // Dereference external entities
  // extractExternalReferences(schema, schema, seenObjects, options, function(err, references) {
  //   if(err) return callback(err);

    // // Dereference the entire object
    // var references = extractReferences(schema, schema, seenObjects, options);
    // // Return the schema
    // callback(null, schema);
  // });


// // Demo: Circular reference
// var o = {};
// o.o = o;

// var cache = [];
// var s = JSON.stringify(schema, function(key, value) {
//     if (typeof value === 'object' && value !== null) {
//         if (cache.indexOf(value) !== -1) {
//             // Circular reference found, discard key
//             return;
//         }
//         // Store value in our collection
//         cache.push(value);
//     }
//     return value;
// });
// cache = null; // Enable garbage collection
// console.dir(s)
}

// De-reference
var deref = function(schema, field, reference, seenObjects, options) {
  if(reference == '#') return {};
  options.maxRecursiveDepth = options.maxRecursiveDepth - 1;
  if(options.maxRecursiveDepth == 0) return {};

  // // Actual reference, let's follow it
  // console.log("------------------------------------------------------------ reference")
  // console.dir(reference)

  // Get the path
  var path = reference.substr(1).split('/').slice(1);
  path = path.map(function(x) {
    x = x.replace(/~1/g, '/').replace(/~0/g, '~');
    return decodeURI(x);
  })

  // console.log("------------------------------------------------------------ path")
  // console.dir(path)
  // console.dir(schema)

  // Get a pointer to the schema
  var pointer = schema;

  // Traverse the schema
  for(var i = 0; i < path.length; i++) {
    pointer = pointer[path[i]];
  }

  // Check if we have seen the object
  var objects = seenObjects.filter(function(x) {
    return x.obj === pointer;
  });

  if(objects.length == 1) {
    seenObjects[0].count = objects[0].count + 1;
  } else {
    seenObjects.push({obj: pointer, count: 1});
  }

  // Do we have a reference
  if(pointer['$ref']) {
    return deref(schema, field, pointer['$ref'], seenObjects, options);
  } else {
    extractReferences(schema, pointer, seenObjects, options);
  }

  return pointer;
} 

// Expand the schema
var extractReferences = function(fullSchema, schema, seenObjects, options) {
  // Top level reference, dereference it
  if(schema['$ref']) {
    // Dereference 
    var dereference = deref(fullSchema, '', schema["$ref"], seenObjects, options);
    // Delete the tag
    delete(schema['$ref']);
    // Merge the dereferenced value
    for(var name in dereference) {
      schema[name] = dereference[name];
    }
  }

  for(var name in schema) {
    var value = schema[name];

    if(value instanceof Object) {
      // Extract the path
      if(value["$ref"]) {
        // Get the reference
        var reference = value["$ref"];       
        // Unroll the reference
        var dereference = deref(fullSchema, name, reference, seenObjects, options);
        // Add the dereferenced value
        schema[name] = dereference;
      } else {
        // Extract the next level
        extractReferences(fullSchema, value, seenObjects, options);
      }
    }
  }
}

CompileState.prototype.buildAST = function(schema, callback) {
  var self = this;
  // The ast
  self.ast = null;
  // Seen objects
  this.seenObjects = [];  
  console.log("-------- 0")

  // Explode the schema
  this.schema = explode(schema, clone(this.options), function(err, schema) {

    // Map the top level
    var result = mapFields(schema);
    console.log("---------------------------------------------- doing")
    console.dir(result)


    // // Array type
    // if(Array.isArray(schema.type)) {
    //   // Generate objects for the schemas
    //   var validations = [];
    //   var types = schema.type.slice(0);

    //   // Iterate over all the types
    //   for(var i = 0; i < schema.type.length; i++) {
    //     var object = clone(schema);
    //     object.type = schema.type[i];
    //     validations.push(object);
    //   }

    //   // Create the type
    //   self.ast = new OneOfType({
    //     validations: self.generateValidations(validations, schema, {performTypeCheck:false})
    //   });
    // }

    // if(schema.oneOf) {
    //   self.ast = new OneOfType({
    //     validations: self.generateValidations(schema.oneOf, schema, {performTypeCheck:false})
    //   });
    // } 

    // if(schema.allOf) {
    //   self.ast = new AllOfType({
    //     validations: self.generateValidations(schema.allOf, schema, {performTypeCheck:false})
    //   });
    // } 

    // if(schema.anyOf) {
    //   self.ast = new AnyOfType({
    //     validations: self.generateValidations(schema.anyOf, schema, {performTypeCheck:false})
    //   });
    // } 

    // if(schema.not) {
    //   self.ast = new NotType({
    //     validations: self.generateValidations([schema.not], schema, {performTypeCheck:false})
    //   });
    // } 

    // // Number
    // // ----------------------------------  
    // if(schema.type && schema.type == 'number' && self.ast == null) {
    //   self.ast = new NumberType({performTypeCheck:true});
    // }

    // // Integer
    // // ----------------------------------  
    // if(schema.type && schema.type == 'integer' && self.ast == null) {
    //   self.ast = new IntegerType({performTypeCheck:true});
    // }

    // // Null
    // // ----------------------------------  
    // if(schema.type && schema.type == 'null' && self.ast == null) {
    //   self.ast = new NullType({performTypeCheck:true});
    // }

    // // Boolean
    // // ----------------------------------  
    // if(schema.type && schema.type == 'boolean' && self.ast == null) {
    //   self.ast = new BooleanType({performTypeCheck:true});
    // }

    // // String
    // // ----------------------------------
    // if(schema.type && schema.type =='string' && self.ast == null) {
    //   self.ast = StringType({performTypeCheck:true});
    // }

    // // Array
    // // ----------------------------------  
    // if(schema.type && schema.type == 'array' && self.ast == null) {
    //   self.ast = new ArrayType({performTypeCheck:true});
    // }

    // // Document
    // // ----------------------------------  
    // if(schema.type && schema.type == 'object' && self.ast == null) {
    //   self.ast = new DocumentType({performTypeCheck:true});
    //   self.ast.object.fields = self.ast.object.fields || {};
    // }

    // if(schema.maxProperties) {
    //   self.ast = self.ast || new DocumentType({performTypeCheck: false});
    //   self.ast.object.fields = self.ast.object.fields || {};
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$lte'] = schema.maxProperties;
    // }

    // if(schema.minProperties) {
    //   self.ast = self.ast || new DocumentType({performTypeCheck: false});
    //   self.ast.object.fields = self.ast.object.fields || {};
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$gte'] = schema.minProperties;
    // }

    // if(schema.minimum) {
    //   self.ast = self.ast || new NumberType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
      
    //   // We have an exclusive minimum
    //   if(schema.exclusiveMinimum) {
    //     self.ast.object.validations['$gt'] = schema.minimum;
    //   } else {
    //     self.ast.object.validations['$gte'] = schema.minimum;
    //   }
    // }

    // if(schema.maximum) {
    //   self.ast = self.ast || new NumberType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
      
    //   // We have an exclusive minimum
    //   if(schema.exclusiveMaximum) {
    //     self.ast.object.validations['$lt'] = schema.maximum;
    //   } else {
    //     self.ast.object.validations['$lte'] = schema.maximum;
    //   }
    // }

    // if(schema.multipleOf) {
    //   self.ast = self.ast || new NumberType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};   
    //   // We have an exclusive minimum
    //   self.ast.object.validations['$multipleOf'] = schema.multipleOf;
    // }

    // // Items
    // // ----------------------------------
    // if(schema.items) {
    //   self.ast = self.ast || new ArrayType({performTypeCheck: false});

    //   // "items": [{}],
    //   if(Array.isArray(schema.items) && schema.additionalItems == false) {
    //     self.ast.object.validations = self.ast.object.validations || {};
    //     self.ast.object.validations['$lte'] = schema.items.length; 

    //     // Map the validations
    //     self.ast.object.of = self.generateValidations(schema.items, {}).map(function(x, i) {
    //       return {index: i, schema: x}
    //     });
    //   } else if(Array.isArray(schema.items) && schema.additionalItems == null) {
    //     // Map the validations
    //     self.ast.object.of = self.generateValidations(schema.items, {}).map(function(x, i) {
    //       return {index: i, schema: x}
    //     });
    //   } else if(Array.isArray(schema.items) && (schema.additionalItems != null && typeof schema.additionalItems == 'object')) {
    //     // Map the validations
    //     self.ast.object.of = self.generateValidations(schema.items, {}).map(function(x, i) {
    //       return {index: i, schema: x}
    //     });

    //     // Set a conditional validation that applies from  schema.items.length and forward
    //     self.ast.object.of.push({
    //       validations: {$gte: schema.items.length},
    //       schema: self.generateValidations([schema.additionalItems], schema).pop()
    //     });
    //   } else if(!Array.isArray(schema.items) && schema.additionalItems == false) {
    //     self.ast.object.of = self.generateValidations([schema.items], schema).pop();
    //   } else if(!Array.isArray(schema.items) && schema.additionalItems == null) {
    //     self.ast.object.of = self.generateValidations([schema.items], schema).pop();
    //   }
    // }

    // // UniqueItems
    // // ----------------------------------
    // if(schema.uniqueItems) {
    //   self.ast = self.ast || new ArrayType({performTypeCheck: false});
    //   self.ast.object.unique = true;
    // }

    // // MaxItems
    // // ----------------------------------
    // if(schema.maxItems) {
    //   self.ast = self.ast || new ArrayType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$lte'] = schema.maxItems;
    // }

    // // MinItems
    // // ----------------------------------
    // if(schema.minItems) {
    //   self.ast = self.ast || new ArrayType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$gte'] = schema.minItems;
    // }

    // // MaxLength
    // // ----------------------------------
    // if(schema.maxLength) {
    //   self.ast = self.ast || new StringType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$lte'] = schema.maxLength;
    // }

    // // MinLength
    // // ----------------------------------
    // if(schema.minLength) {
    //   self.ast = self.ast || new StringType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$gte'] = schema.minLength;
    // }

    // // Pattern
    // // ----------------------------------
    // if(schema.pattern) {
    //   self.ast = self.ast || new StringType({performTypeCheck: false});
    //   self.ast.object.validations = self.ast.object.validations || {};
    //   self.ast.object.validations['$regexp'] = schema.pattern;
    // } 

    // // Properties
    // // ----------------------------------
    // if(schema.properties || schema.patternProperties || schema.additionalProperties) {
    //   self.ast = self.ast || new DocumentType({performTypeCheck:false});
    //   self.ast.object.fields = self.ast.object.fields || {};
    //   // Get the properties
    //   var properties = schema.properties || {};
    //   // Properties
    //   properties = clone(schema.properties);

    //   // Decorate the with properties
    //   self.addProperties(self.ast, schema.properties, self.ast.object.fields, self.options);

    //   // If additonalFields is a object
    //   if(schema.additionalProperties != null && typeof schema.additionalProperties == 'object') {
    //     self.ast.object.additionalProperties = self.generateValidations([schema.additionalProperties], schema).pop();
    //   } else if(typeof schema.additionalProperties === 'boolean') {
    //     self.ast.object.additionalProperties = schema.additionalProperties;
    //   }

    //   // Iterate over all the patterns
    //   for(var name in schema.patternProperties) {
    //     var field = schema.patternProperties[name];
    //     console.dir(field)
    //     if(!self.ast.object.patternProperties) self.ast.object.patternProperties = {};
    //     self.ast.object.patternProperties[name] = self.generateValidations([field], schema).pop();
    //   }
    // }

    // // Requires
    // // ----------------------------------
    // if(schema.required) {
    //   self.ast = self.ast || new DocumentType({});
    //   // Get the required fields
    //   var required = schema.required.slice(0);
    //   // Add the object required fields
    //   self.ast.object.required = required;
    // }

    // // Enum
    // // ----------------------------------
    // if(schema.enum) {
    //   self.ast = new EnumType({enum: schema.enum, ast: self.ast})
    // }

    // // We have a default value
    // if(schema.default) {
    //   self.ast.object.default = schema.default;
    // }

    // Return the AST
    callback(null, result);
  });
}

// CompileState.prototype.generateValidations = function(validations, schema, options) {
//   var self = this;
//   options = options || {};
//   var skipOnWrongType = typeof options.skipOnWrongType == 'boolean'
//     ? options.skipOnWrongType : true;
//   console.log("JSONSchema ####################################################### generateValidations")
//   console.dir(validations)
//   // Final validations
//   var finalValidations = [];
//   // If we have any type's that arrays, break up
//   for(var i = 0; i < validations.length; i++) {
//     var val = validations[i];

//     if(Array.isArray(val.type)) {
//       finalValidations = finalValidations.concat(val.type.map(function(x) {
//         return {type: x};
//       }));
//     } else {
//       finalValidations.push(validations[i]);
//     }
//   }

//   // Iterate over all the entries
//   var f = finalValidations.map(function(x) {
//     console.log("---------------------------------------------- validation")
//     console.dir(x)
//     var validation = null;

//     // Number/Integer
//     // ----------------------------------  
//     if(x.type && x.type == 'integer') {
//       validation = new IntegerType({performTypeCheck:true});
//     }

//     if(x.minimum) {
//       validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};      

//       // We have an exclusive minimum
//       if(schema.exclusiveMinimum) {
//         validation.object.validations['$gt'] = x.minimum;
//       } else {
//         validation.object.validations['$gte'] = x.minimum;
//       }
//     }

//     if(x.maximum) {
//       validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};

//       // We have an exclusive minimum
//       if(schema.exclusiveMaximum) {
//         validation.object.validations['$lt'] = x.maximum;
//       } else {
//         validation.object.validations['$lte'] = x.maximum;
//       }
//     }    

//     // Boolean
//     // ----------------------------------  
//     if(x.type && x.type == 'boolean') {
//       validation = new BooleanType({performTypeCheck:true});
//     }

//     // String
//     // ----------------------------------
//     if(x.type && x.type =='string') {
//       validation = StringType({performTypeCheck:true});
//     }

//     if(x.minLength) {
//       validation = validation || new StringType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$gte'] = x.minLength;
//     }

//     if(x.maxLength) {
//       validation = validation || new StringType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$lte'] = x.maxLength;
//     }

//     // Array
//     // ----------------------------------  
//     if(x.type && x.type == 'array') {
//       validation = new ArrayType({performTypeCheck:true});
//     }

//     if(x.maxItems) {
//       validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$lte'] = x.maxItems;
//     }

//     if(x.minItems) {
//       validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$gte'] = x.minItems;
//     }

//     // Properties
//     // ----------------------------------
//     if(x.properties) {
//       validation = validation || new DocumentType({});
//       validation.object.fields = validation.object.fields || {};

//       // Properties
//       var properties = clone(x.properties);

//       // Does the top level schema have properties
//       if(schema.properties) {
//         for(var name in schema.properties) {
//           properties[name] = schema.properties[name];
//         }
//       }

//       // Decorate the with properties
//       self.addProperties(validation, x.properties, validation.object.fields, self.options);
//     }

//     if(schema.maxProperties) {
//       validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
//       validation.object.fields = validation.object.fields || {};
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$lte'] = schema.maxProperties;
//     }

//     if(schema.minProperties) {
//       validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
//       validation.object.fields = validation.object.fields || {};
//       validation.object.validations = validation.object.validations || {};
//       validation.object.validations['$gte'] = schema.minProperties;
//     }

//     // Requires
//     // ----------------------------------
//     if(x.required) {
//       validation = validation || new DocumentType({});
//       // Get the required fields
//       var required = x.required.slice(0);

//       // Top level required
//       if(schema.required) {
//         required = required.concat(schema.required);
//       }

//       // Add the object required fields
//       validation.object.required = required;
//     }

//     // Enum
//     // ----------------------------------
//     if(x.enum) {
//       validation = new EnumType({enum: x.enum, ast: validation})
//     }

//     if(validation == null) {
//       validation = new AnyType({});
//     }

//     // We have a default value
//     if(x.default) {
//       validation.object.default = x.default;
//     }

//     return validation;
//   });

//   // Flatten the validations array
//   var final = [];
//   for(var i = 0; i < f.length; i++) {
//     if(Array.isArray(f[i])) final = final.concat(f[i]);
//     else final.push(f[i]);
//   }

//   // Return the final validations array
//   return final;
// }

// CompileState.prototype.addProperties = function(validation, properties, fields, options) {
//   var self = this;
//   // Got over all the properties
//   for(var name in properties) {
//     // Get the field information
//     var field = properties[name];

//     // Figure out the type
//     if(field.type == 'integer') {
//       fields[name] = new IntegerType({performTypeCheck:true});
//     }

//     if(field.type == 'string') {
//       fields[name] = new StringType({performTypeCheck:true});
//     }

//     if(field.type == 'array') {
//       fields[name] = new ArrayType({performTypeCheck:true});

//       if(field.maxItems) {
//         fields[name].object.validations = fields[name].object.validations || {};
//         fields[name].object.validations['$lte'] = field.maxItems;
//       }
//     }

//     if(Object.keys(field).length == 0) {
//       fields[name] = new AnyType({});
//     }

//     if(field.not) {
//       validation.object.prohibited = validation.object.prohibited || [];
//       validation.object.prohibited.push(name);
//     }

//     if(field.enum) {
//       fields[name] = new EnumType({enum: field.enum, ast: fields[name]})
//     }

//     if(field.default) {
//       fields[name].object.default = field.default;
//     }

//     // Properties
//     // ----------------------------------
//     if(field.properties) {
//       // Check if we have seen the object
//       var objects = this.seenObjects.filter(function(x) {
//         return x.obj === field;
//       });

//       if(objects.length == 1) {
//         this.seenObjects[0].count = objects[0].count + 1;

//         if(this.seenObjects[0].count == options.maxRecursiveDepth) {
//           return new AnyType({});
//         }
//       } else {
//         this.seenObjects.push({obj: field, count: 1});
//       }

//       fields[name] = fields[name] || new DocumentType({performTypeCheck:false});
//       fields[name].object.fields = fields[name].object.fields || {};

//       if(typeof field.additionalProperties === 'boolean') {
//         fields[name].object.additionalProperties = field.additionalProperties;
//       }

//       // Properties
//       var properties = clone(field.properties);

//       // // Does the top level schema have properties
//       // if(schema.properties) {
//       //   for(var name in schema.properties) {
//       //     properties[name] = schema.properties[name];
//       //   }
//       // }

//       // Decorate the with properties
//       self.addProperties(fields[name], field.properties, fields[name].object.fields, options);
//     }

//     if(fields[name] == null) {
//       fields[name] = new AnyType({});
//     }
//   } 
// }

var mapFields = function(x, skipOnWrongType) {
  var validation = null;
  skipOnWrongType = typeof skipOnWrongType == 'boolean' ? skipOnWrongType : false;

  // Integer
  // ----------------------------------  
  if(x.type && x.type == 'integer') {
    validation = new IntegerType({performTypeCheck:true});
  }

  // Number
  // ----------------------------------  
  if(x.type && x.type == 'number') {
    validation = new NumberType({performTypeCheck:true});
  }

  // Object
  // ----------------------------------  
  if(x.type && x.type == 'object') {
    validation = new DocumentType({performTypeCheck:true});
  }

  // Array
  // ----------------------------------  
  if(x.type && x.type == 'array') {
    validation = new ArrayType({performTypeCheck:true});
  }

  // Null
  // ----------------------------------  
  if(x.type && x.type == 'null') {
    validation = new NullType({performTypeCheck:true});
  }

  // Boolean
  // ----------------------------------  
  if(x.type && x.type == 'boolean') {
    validation = new BooleanType({performTypeCheck:true});
  }

  // String
  // ----------------------------------
  if(x.type && x.type =='string') {
    validation = StringType({performTypeCheck:true});
  }

  // Not
  // ----------------------------------
  if(x.not) {
    validation = new NotType({
      validations: [mapFields(x.not)]
    });
  } 

  // Top level mappable fields
  // ----------------------------------
  var mergeValidations = function(x, v) {
    var mappableFields = ['type', 'required'];
    // Clone the value
    v = clone(v);
    // Check if we have any other top level fields
    for(var name in x) {
      if(mappableFields.indexOf(name) != -1) {
        if(!Array.isArray(v[name])) {
          v[name] = x[name];          
        } else {
          v[name] = v[name].concat(x[name]);
        }
      }
    }

    return v;
  }

  if(x.oneOf) {
    validation = new OneOfType({
      validations: x.oneOf.map(function(v) {
        return mapFields(mergeValidations(x,v));
      })
    });
  } 

  if(x.anyOf) {
    validation = new AnyOfType({
      validations: x.anyOf.map(function(v) {
        return mapFields(mergeValidations(x,v));
      })
    });
  } 

  if(x.allOf) {
    validation = new AllOfType({
      validations: x.allOf.map(function(v) {
        return mapFields(mergeValidations(x,v));
      })
    });

    console.log("------------------------------------")
    console.log(JSON.stringify(validation, null, 2))
  } 

  // Multiple types
  // ----------------------------------
  if(Array.isArray(x.type)) {
    // Generate objects for the schemas
    var validations = [];
    var types = x.type.slice(0);

    // Iterate over all the types
    for(var i = 0; i < x.type.length; i++) {
      var object = clone(x);
      object.type = x.type[i];
      validations.push(object);
    }

    // Create the type
    validation = new OneOfType({
      validations: validations.map(function(x) {
        return mapFields(x);
      })
    });
  }

  // Number/Integer
  // ----------------------------------  
  if(x.minimum) {
    validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};      

    // We have an exclusive minimum
    if(x.exclusiveMinimum) {
      validation.object.validations['$gt'] = x.minimum;
    } else {
      validation.object.validations['$gte'] = x.minimum;
    }
  }

  if(x.maximum) {
    validation = validation || new NumberType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};

    // We have an exclusive minimum
    if(x.exclusiveMaximum) {
      validation.object.validations['$lt'] = x.maximum;
    } else {
      validation.object.validations['$lte'] = x.maximum;
    }
  }    

  // String
  // ----------------------------------  
  if(x.minLength) {
    validation = validation || new StringType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$gte'] = x.minLength;
  }

  if(x.maxLength) {
    validation = validation || new StringType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$lte'] = x.maxLength;
  }

  // Array
  // ----------------------------------  
  if(x.maxItems) {
    validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$lte'] = x.maxItems;
  }

  if(x.minItems) {
    validation = validation || new ArrayType({performTypeCheck: skipOnWrongType});
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$gte'] = x.minItems;
  }

  // Object
  // ----------------------------------
  if(x.properties) {
    // console.log("====================================================== properties")
    validation = validation || new DocumentType({});
    validation.object.fields = validation.object.fields || {};

    // Properties
    var properties = clone(x.properties);
    // console.log("====================================================== properties")
    // console.dir(properties)

    // Does the top level schema have properties
    if(properties) {
      for(var name in properties) {
        validation.object.fields[name] = mapFields(properties[name], skipOnWrongType);
        
        // Check if the properties contains an empty not field, signifying the
        // field should not be included
        if(properties[name].not && Object.keys(properties[name].not).length == 0) {
          validation.object.prohibited = validation.object.prohibited || [];
          validation.object.prohibited.push(name);
        }
      }
    }
  }

  if(x.maxProperties) {
    validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
    validation.object.fields = validation.object.fields || {};
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$lte'] = x.maxProperties;
  }

  if(x.minProperties) {
    validation = validation || new DocumentType({performTypeCheck: skipOnWrongType});
    validation.object.fields = validation.object.fields || {};
    validation.object.validations = validation.object.validations || {};
    validation.object.validations['$gte'] = x.minProperties;
  }

  // Requires
  // ----------------------------------
  if(x.required) {
    validation = validation || new DocumentType({});
    // Get the required fields
    var required = x.required.slice(0);
    // Add the object required fields
    validation.object.required = required;
  }

  // Enum
  // ----------------------------------
  if(x.enum) {
    validation = new EnumType({enum: x.enum, ast: validation})
  }

  if(validation == null) {
    validation = new AnyType({});
  }

  // We have a default value
  if(x.default) {
    validation.object.default = x.default;
  }

  return validation; 
}



module.exports = JSONSchema;






