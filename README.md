#RDS (Restangular Data Store)

RDS is an AngularJS based data store which is built on top of [Restangular](https://github.com/mgonto/restangular).

#Why do we need RDS ?

The model part of MVC* in AngularJS is the scope object which is more of a view model & I found data model to be the missing piece in AngularJS. The traditional way of dealing with data model using `$http` seemed pretty hard to maintain on a complex web application. And coming to AngularJS after building complex web applications using EmberJS & BackboneJS, I was really missing a standard way to organize data models in AngularJS similar to `Backbone.Model`, `Backbone.Collection` & ember data.

I wanted a way to define my data model schema, enhance certain properties, cache certain records, add custom methods & make it more robust. I did alot of research & found [Restangular](https://github.com/mgonto/restangular) to be pretty exquisite but it is missing datastore. This module aims to fill that gap. I also plan to bring the best of features from ember data, backbone model-collections.

#Usage

## Defining the model resource

```js
angular
    .module('app')
    .factory('User', User);

function User(RDS) {
    return RDS.defineResource('users', {
        _defaults: {
            admin: false
        },
        idAttribute: 'userID',
        firstName: RDS.property('string'),
        lastName: RDS.property('string'),
        age: RDS.property('number'),
        admin: RDS.property('boolean'),
        birthDay: RDS.property('date'),
        organization: RDS.belongsTo('organization'),
        blog_posts: RDS.hasMany('blog_posts'),
        fullName: fullName
    });

    function fullName() {
        return this.firstName + this.lastName;
    }
}
```

## Accessing the model

```js
angular
    .module('app')
    .controller('UserController', UserController);

function UserController($scope, User) {
    //GET /users?admin=false, returns an enhance array which gets populated once the data is returned
    vm.users = User.findAll({admin: false});
    // GET /users/1, returns a js object which gets populated by the properties on data load
    vm.user = User.find(1);
    // client side record of the same
    vm.new_user = User.create({some: 'params'});
    vm.new_user_from_list = vm.users.create({some: 'params'});
    vm.another_new_user = User.create({some: 'params'});

    vm.users.push(vm.another_new_user);

    vm.user.save({updated: 'property'}); // update the record using PUT
    vm.new_user.save(); // create a new record using POST
    vm.new_user_from_list.save(); //this record will get pushed into the list after save
    vm.another_new_user.save(); // this record is already pushed into the list

    vm.user.remove(); // DELETE, has nothing to do with any list
    vm.new_user.remove(); // DELETE, this one too has nothing to do with any list
    vm.new_user_from_list.remove(); // this guy gets removed from the list after DELETE
    vm.another_new_user.remove(); // gets removed from the list too after DELETE}
```

* Each record/collection object would have `isLoaded` property to indicate if it is loaded or not.
* Each record would have a property `$new` to indicate if it's persisted or not
* Each record would have a property `$dirty` to indicate if it has unsaved changes
* Each record would have a method `changedAttributes()` which returns a list of changed attributes
* Each record would have a method `rollback()` which rollsback the changes
* Each collection would have a method `findWhere()` which returns an object from the collection for the given query
* Each collection would have a method `where()` which returns a list of objects from the collection for the given query


## Referencing it in the template
```html
<spinner data-ng-hide="users.isLoaded"></spinner>
<ul data-ng-repeat="user in users" data-ng-show="users.isLoaded">
    <li>{{user.fullName()}}</li>
</ul>
```

#Dependencies

RDS depends on Angular and Restangular.
