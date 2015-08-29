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
  NotType = require('vitesse').NotType,
  AnyType = require('vitesse').AnyType,
  DocumentType = require('vitesse').DocumentType;

// Validators
var StringValidator = require('vitesse'),
  ObjectValidator = require('vitesse'),
  NumericValidator = require('vitesse'),
  NestedArrayValidator = require('vitesse'),
  ExistsValidator = require('vitesse'),
  ArrayValidator = require('vitesse');

var clone = function(o) { var ob = {}; for(var n in o) ob[n] = o[n]; return ob; }

var JSONSchema = function() {  
}

JSONSchema.prototype.compile = function(schema, options, callback) {
  if(typeof options == 'function') callback = options, options = {};
  options = options || {};
  var closure = typeof options.closure == 'boolean' ? options.closure : false;

  // Build the target schema
  var ast = buildAST(schema);

  // console.log("----------------------------------------------------- schema start")
  // console.log(JSON.stringify(schema, null, 2))
  // console.log("----------------------------------------------------- schema end")
  // console.log("----------------------------------------------------- ast")
  // console.dir(ast)

  // Compile the AST
  var compiler = new Compiler();
  var validator = compiler.compile(ast, options);
  callback(null, validator);
}

var buildAST = function(schema) {
  var ast = null;

  if(schema.oneOf) {
    ast = new OneOfType({
      validations: generateValidations(schema.oneOf, schema, {skipOnWrongType:false})
    });
  } 

  if(schema.allOf) {
    ast = new AllOfType({
      validations: generateValidations(schema.allOf, schema, {skipOnWrongType:false})
    });
  } 

  if(schema.anyOf) {
    ast = new AnyOfType({
      validations: generateValidations(schema.anyOf, schema, {skipOnWrongType:false})
    });
  } 

  if(schema.not) {
    ast = new NotType({
      validations: generateValidations([schema.not], schema, {skipOnWrongType:false})
    });
  } 

  if(schema.maxProperties) {
    ast = ast || new DocumentType({skipOnWrongType: true});
    ast.object.fields = ast.object.fields || {};
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$lte'] = schema.maxProperties;
  }

  if(schema.minProperties) {
    ast = ast || new DocumentType({skipOnWrongType: true});
    ast.object.fields = ast.object.fields || {};
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$gte'] = schema.minProperties;
  }

  if(schema.minimum) {
    ast = ast || new NumberType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    
    // We have an exclusive minimum
    if(schema.exclusiveMinimum) {
      ast.object.validations['$gt'] = schema.minimum;
    } else {
      ast.object.validations['$gte'] = schema.minimum;
    }
  }

  if(schema.maximum) {
    ast = ast || new NumberType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    
    // We have an exclusive minimum
    if(schema.exclusiveMaximum) {
      ast.object.validations['$lt'] = schema.maximum;
    } else {
      ast.object.validations['$lte'] = schema.maximum;
    }
  }

  if(schema.multipleOf) {
    ast = ast || new NumberType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};   
    // We have an exclusive minimum
    ast.object.validations['$multipleOf'] = schema.multipleOf;
  }

  // Items
  // ----------------------------------
  if(schema.items) {
    ast = ast || new ArrayType({skipOnWrongType: true});

    // "items": [{}],
    if(Array.isArray(schema.items) && schema.additionalItems == false) {
      ast.object.validations = ast.object.validations || {};
      ast.object.validations['$lte'] = schema.items.length; 

      // Map the validations
      ast.object.of = generateValidations(schema.items, {}).map(function(x, i) {
        return {index: i, schema: x}
      });
    } else if(Array.isArray(schema.items) && schema.additionalItems == null) {
      // Map the validations
      ast.object.of = generateValidations(schema.items, {}).map(function(x, i) {
        return {index: i, schema: x}
      });
    } else if(Array.isArray(schema.items) && (schema.additionalItems != null && typeof schema.additionalItems == 'object')) {
      // Map the validations
      ast.object.of = generateValidations(schema.items, {}).map(function(x, i) {
        return {index: i, schema: x}
      });

      // Set a conditional validation that applies from  schema.items.length and forward
      ast.object.of.push({
        validations: {$gte: schema.items.length},
        schema: generateValidations([schema.additionalItems], schema).pop()
      });
    } else if(!Array.isArray(schema.items) && schema.additionalItems == false) {
      ast.object.of = generateValidations([schema.items], schema).pop();
    } else if(!Array.isArray(schema.items) && schema.additionalItems == null) {
      ast.object.of = generateValidations([schema.items], schema).pop();
    }
  }

  // UniqueItems
  // ----------------------------------
  if(schema.uniqueItems) {
    ast = ast || new ArrayType({skipOnWrongType: true});
    ast.object.unique = true;
  }

  // MaxItems
  // ----------------------------------
  if(schema.maxItems) {
    ast = ast || new ArrayType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$lte'] = schema.maxItems;
  }

  // MinItems
  // ----------------------------------
  if(schema.minItems) {
    ast = ast || new ArrayType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$gte'] = schema.minItems;
  }

  // MaxLength
  // ----------------------------------
  if(schema.maxLength) {
    ast = ast || new StringType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$lte'] = schema.maxLength;
  }

  // MinLength
  // ----------------------------------
  if(schema.minLength) {
    ast = ast || new StringType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$gte'] = schema.minLength;
  }

  // Pattern
  // ----------------------------------
  if(schema.pattern) {
    ast = ast || new StringType({skipOnWrongType: true});
    ast.object.validations = ast.object.validations || {};
    ast.object.validations['$regexp'] = schema.pattern;
  } 

  // Properties
  // ----------------------------------
  if(schema.properties || schema.patternProperties || schema.additionalProperties) {
    ast = ast || new DocumentType({skipOnWrongType:true});
    ast.object.fields = ast.object.fields || {};
    // Get the properties
    var properties = schema.properties || {};
    // Properties
    properties = clone(schema.properties);

    // Decorate the with properties
    addProperties(ast, schema.properties, ast.object.fields);

    // If additonalFields is a object
    if(schema.additionalProperties != null && typeof schema.additionalProperties == 'object') {
      ast.object.additionalProperties = generateValidations([schema.additionalProperties], schema).pop();
    } else if(typeof schema.additionalProperties === 'boolean') {
      ast.object.additionalProperties = schema.additionalProperties;
    }

    console.log("================================================== GENERATE")
    // Iterate over all the patterns
    for(var name in schema.patternProperties) {
      var field = schema.patternProperties[name];
      console.dir(field)
      if(!ast.object.patternProperties) ast.object.patternProperties = {};
      ast.object.patternProperties[name] = generateValidations([field], schema).pop();
    }

    console.log("==================================================")
    console.dir(ast.object)
  }

  // Requires
  // ----------------------------------
  if(schema.required) {
    ast = ast || new DocumentType({});
    // Get the required fields
    var required = schema.required.slice(0);
    // Add the object required fields
    ast.object.required = required;
  }

  return ast;
}

var generateValidations = function(validations, schema, options) {
  options = options || {};
  var skipOnWrongType = typeof options.skipOnWrongType == 'boolean'
    ? options.skipOnWrongType : true;
  // console.log("JSONSchema ####################################################### generateValidations")
  // Final validations
  var finalValidations = [];
  // If we have any type's that arrays, break up
  for(var i = 0; i < validations.length; i++) {
    var val = validations[i];

    if(Array.isArray(val.type)) {
      finalValidations = finalValidations.concat(val.type.map(function(x) {
        return {type: x};
      }));
    } else {
      finalValidations.push(validations[i]);
    }
  }

  // Iterate over all the entries
  var f = finalValidations.map(function(x) {
    // console.log("---------------------------------------------- validation")
    // console.dir(x)
    var validation = null;

    // Number/Integer
    // ----------------------------------  
    if(x.type && x.type == 'integer') {
      validation = new IntegerType({});
    }

    if(x.minimum) {
      validation = validation || new NumberType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};      

      // We have an exclusive minimum
      if(schema.exclusiveMinimum) {
        validation.object.validations['$gt'] = x.minimum;
      } else {
        validation.object.validations['$gte'] = x.minimum;
      }
    }

    if(x.maximum) {
      validation = validation || new NumberType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};

      // We have an exclusive minimum
      if(schema.exclusiveMaximum) {
        validation.object.validations['$lt'] = x.maximum;
      } else {
        validation.object.validations['$lte'] = x.maximum;
      }
    }    

    // Boolean
    // ----------------------------------  
    if(x.type && x.type == 'boolean') {
      validation = new BooleanType({});
    }

    // String
    // ----------------------------------
    if(x.type && x.type =='string') {
      validation = StringType({});
    }

    if(x.minLength) {
      validation = validation || new StringType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$gte'] = x.minLength;
    }

    if(x.maxLength) {
      validation = validation || new StringType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$lte'] = x.maxLength;
    }

    // Array
    // ----------------------------------  
    if(x.type && x.type == 'array') {
      validation = new ArrayType({skipOnWrongType: skipOnWrongType});
    }

    if(x.maxItems) {
      validation = validation || new ArrayType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$lte'] = x.maxItems;
    }

    if(x.minItems) {
      validation = validation || new ArrayType({skipOnWrongType: skipOnWrongType});
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$gte'] = x.minItems;
    }

    // Properties
    // ----------------------------------
    if(x.properties) {
      validation = validation || new DocumentType({});
      validation.object.fields = validation.object.fields || {};

      // Properties
      var properties = clone(x.properties);

      // Does the top level schema have properties
      if(schema.properties) {
        for(var name in schema.properties) {
          properties[name] = schema.properties[name];
        }
      }

      // Decorate the with properties
      addProperties(validation, x.properties, validation.object.fields);
    }

    if(schema.maxProperties) {
      validation = validation || new DocumentType({skipOnWrongType: skipOnWrongType});
      validation.object.fields = validation.object.fields || {};
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$lte'] = schema.maxProperties;
    }

    if(schema.minProperties) {
      validation = validation || new DocumentType({skipOnWrongType: skipOnWrongType});
      validation.object.fields = validation.object.fields || {};
      validation.object.validations = validation.object.validations || {};
      validation.object.validations['$gte'] = schema.minProperties;
    }

    // Requires
    // ----------------------------------
    if(x.required) {
      validation = validation || new DocumentType({});
      // Get the required fields
      var required = x.required.slice(0);

      // Top level required
      if(schema.required) {
        required = required.concat(schema.required);
      }

      // Add the object required fields
      validation.object.required = required;
    }

    if(validation == null) {
      validation = new AnyType({});
    }

    return validation;
  });

  // Flatten the validations array
  var final = [];
  for(var i = 0; i < f.length; i++) {
    if(Array.isArray(f[i])) final = final.concat(f[i]);
    else final.push(f[i]);
  }

  // Return the final validations array
  return final;
}

var addProperties = function(validation, properties, fields) {
  // Got over all the properties
  for(var name in properties) {
    // Get the field information
    var field = properties[name];
    
    // Figure out the type
    if(field.type == 'integer') {
      fields[name] = new IntegerType({});
    }

    if(field.type == 'string') {
      fields[name] = new StringType({});
    }

    if(field.type == 'array') {
      fields[name] = new ArrayType({});

      if(field.maxItems) {
        fields[name].object.validations = fields[name].object.validations || {};
        fields[name].object.validations['$lte'] = field.maxItems;
      }
    }

    if(Object.keys(field).length == 0) {
      fields[name] = new AnyType({});
    }

    if(field.not) {
      validation.object.prohibited = validation.object.prohibited || [];
      validation.object.prohibited.push(name);
    }
  } 
}

module.exports = JSONSchema;






