(function() {
var rds = angular.module('rds', []);

rds.provider('RDS', RDSProvider);

function RDSProvider() {
    var schemaMap = {};
    var idAttributeMap = {};

    this.$get = ['Restangular', '$parse', function(Restangular, $parse) {
        var _getIdFromElem = Restangular.configuration.getIdFromElem;

        Restangular.configuration.getIdFromElem = function(elem) {
            var idAttribute = idAttributeMap[elem.route];

            if (idAttribute) {
                return $parse(idAttribute)(elem);
            } else if (_.isFunction(_getIdFromElem)) {
                return _getIdFromElem(elem);
            }
        };

        function createRDSService() {
            var service = {
                defineResource: defineResource,
                property: property,
                belongsTo: belongsTo,
                hasMany: hasMany
            };

            return service;

            function defineResource(name, options) {
                var schema = extractSchema(options);
                var instanceMethods = extractInstanceMethods(options);

                idAttributeMap[name] = options.idAttribute;
                schemaMap[name] = schema;

                Restangular.extendModel(name, function(model) {
                    _(instanceMethods).each(function(value, key) {
                        model[key] = value;
                    });

                    return model;
                });

                return new Resource(name, schema);
            }

            function extractSchema(options) {
                var schema = {};

                _(options).each(function(value, key) {
                    if (value instanceof Property || value instanceof Relation) {
                        schema[key] = value;
                    }
                });

                return schema;
            }

            function extractInstanceMethods(options) {
                var methods = {};

                _(options).each(function(value, key) {
                    if (_.isFunction(value)) {
                        methods[key] = value;
                    }
                });

                return methods;
            }

            function property() {}

            function belongsTo() {}

            function hasMany() {}
        }

        function Property() {}

        function Relation() {}

        function Resource(name, options) {
            options = options || {};

            this.name = name;
            this.defaults = options.defaults || {};
            this.$restangular = Restangular.service(name);

            _(options).each(function (value, key) {
                // define request/response transformers for serializing/deserializing columns
            });
        }

        Resource.prototype = {
            findAll: function() {
                return new Collection(this.$restangular.getList.apply(this, arguments));
            },

            find: function() {
                var id = arguments[0];
                var args = _.rest(arguments);

                return new Record(this.$restangular.one(id).get.apply(this, args));
            },

            create: function() {
                var new Record()
            }
        }

        function DataModel(promise) {
            var self = this;

            this.$promise = promise;
            this.isLoaded = false;

            promise.finally(function() {
                self.isLoaded = true;
            });
        }

        function Collection(promise) {
            var self = this;

            DataModel.call(this, promise);
            this.records = [];

            promise.then(function(response) {
                _(response).each(function(item) {
                    self.records.push(new Record(item, self.schema));
                });
            });

            this.records = promise.$object;
        }

        function Record(restangularizedData, schema) {
            var self = this;

            this.schema = schema; // required for transformations

            if (_.isFunction(restangularizedData.then)) {
                this.isLoaded = false;

                restangularizedData.then(function(response) {
                    restangularizedData = response;
                    initialize();
                });
            } else {
                initialize();
            }

            function initialize() {
                self.isLoaded = true;

                _.extend(this, restangularizedData);

                _(schema).each(function(value, key) {
                    self[key] = value.deserialize(self[key]);
                });
            }
        }

        Record.prototype = {
            save: function() {} //PUT/POST based on id
        };

        return createRDSService();
    }];
}
})();
