(function() {
var rds = angular.module('rds', []);

rds.provider('RDS', RDSProvider);

function RDSProvider() {

    this.$get = ['Restangular', function(Restangular) {
        function createRDSService() {
            var service = {
                defineResource: defineResource,
                property: property,
                belongsTo: belongsTo,
                hasMany: hasMany
            };

            return service;

            function defineResource(name, schema) {
                return new Resource(name, schema);
            }

            function property() {}

            function belongsTo() {}

            function hasMany() {}
        }

        function Resource(name, options) {
            options = options || {};

            this.name = name;
            this.idAttribute = options.idAttribute;
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