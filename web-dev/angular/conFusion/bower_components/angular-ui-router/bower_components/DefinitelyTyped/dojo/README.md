# Dojo Definitions Usage Notes

## Overview
Anyone that has used Dojo for any length of time has probably discovered three things:
* Dojo is very powerful
* Dojo can be challenging to learn
* Dojo doesn't always play well with other

Having said that, there are ways that Dojo can be coerced out of its shell to work with other JavaScript technologies. This README is intended to describe some techniques for getting the full power of Dojo to work in an environment where almost everything can take advantage of TypeScript.

*Disclaimer*: Dojo is VERY big framework and, as such the type definitions are generated by a [tool](https://github.com/vansimke/DojoTypeDescriptionGenerator) from dojo's [API](dojotoolkit.org/api) docs. The generated files were then hand-polished to eliminate any import errors and clean up some obvious errors. This is all to say that the generated type definitions are not flawless and are not guaranteed to reflect the actual implementations.

## Basic Usage
A normal dojo module might look something like this:

```js
 define(['dojo/request', 'dojo/request/xhr'],
     function (request, xhr) {
         ...

     }
 );
```

When using the TypeScript, you can write the following: 

```ts
import request = require("dojo/request");
import xhr = require("dojo/request/xhr");

...

 ```
 
 Inside of the define variable, both `request` and `xhr` will work as the functions that come from Dojo, only they are strongly typed.
 
## Advanced Usage
 Dojo and TypeScript both use different and conflicting class semantics. In order to satisfy both systems, some unconventional work is needed. 

For the example, let's take this example custom Dojo widget:

```js
    define(["dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./templates/Foo.html", "dojo/i18n!app/common/nls/resources",
        "dijit/form/TextBox"], 
    function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
        template, res) {

        templateString: template,
        res: res,
        myArray: null,

        constructor: function() {
            this.myArray = [];
        },

        sayHello: function() {
            alert(res.message.helloTypeScript);
        }
    });
```

the equivalent TypeScript version is next, explanation of each section below:

```ts
/// <amd-dependency path="dojo/text!./_templates/Foo.html" />
/// <amd-dependency path="dojo/i18n!app/common/nls/resources" />

/// <amd-dependency path="dijit/form/TextBox" />

/// <reference path="../typings/dojo.d.ts" />
/// <reference path="../typings/dijit.d.ts" />

declare var require: (moduleId: string) => any;

import dojoDeclare = require("dojo/_base/declare");
import _WidgetBase = require("dijit/_WidgetBase");
import _TemplatedMixin = require("dijit/_TemplatedMixin");
import _WidgetsInTemplateMixin = require("dijit/_WidgetsInTemplateMixin");


// make sure to set the 'dynamic' fields of the dojo/text and dojo/i18n modules to 'false' in
// order to ensure that Dojo loads the tempalte and resources from its cache instead of trying to 
// pull from the server
var template:string = require("dojo/text!./templates/Foo.html");
var res = require("dojo/i18n!app/common/nls/resources");

class Foo extends dijit._WidgetBase {
    constructor(args?: Object, elem?: HTMLElement) {
        return new Foo_(args, elem);
        super();
    }

    res: any;

    myArray: string[];

    sayHello(): void {
        alert(res.message.helloTypeScript);
    }
}

var Foo_ = dojoDeclare("", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], (function (Source: any) {
    var result: any = {};
	result.templateString = template;
	result.res = res;
    result.constructor = function () {
        this.myArray = [];
    }
    for (var i in Source.prototype) {
        if (i !== "constructor" && Source.prototype.hasOwnProperty(i)) {
            result[i] = Source.prototype[i];
        }
    }
    return result;
} (Foo)));

export =Foo;
```

Well, no one ever said that it would be easy... but it isn't too bad. Let's go through this one step at a time.

The first two lines are required due to TypeScript's inability to work with plugin-type modules. Since we need to use plugins, we use this technique. Basically, the 'amd-dependency' comments are directives to the TypeScript compiler that asks it to add the value in the "path" attribute as a dependency in the module's "define" statement. This directive, however, does not allow a variable to be assigned into the module. To obtain that, we need to add these two lines:

```ts
var template:string = require("dojo/text!./templates/Foo.html");
var res = require("dojo/i18n!app/common/nls/resources");
```

These statements will trigger context-sensitive require calls to be made to pull the requested values from the Dojo loader's cache. Unfortunately, this usage of "require" is not recognized. In order to make this work a new function prototype must be declared, thus this line:

```ts
declare var require: (moduleId: string) => any;
```

There is one more thing that we have to do in order to get the plugins to work properly. The AMD spec (that Dojo's loader adheres to) states that plugins should be loaded dynamically from the server (i.e. the loader shouldn't cache the response). This, I presume, is to allow content to be dynamically generated by the server. This, however, means that the context-sensitive require fails (since it isn't allowed to use the cache). In order correct this, the dojo/text and dojo/i18n modules must be loaded in advance and their 'dynamic' fields set to false. If your app has a single entry point, then you can create something like this (JavaScript shown):

```js
define(["require", "dojo/dom", "dojo/text", "dojo/i18n"],
    function (require, dom, text, i18n) {
    
    //set dojo/text and dojo/i18n to static resources to allow to be loaded via
    //require() call inside of module and load cached version
    text.dynamic = false;
    i18n.dynamic = false;
    require(["./views/ShellView"], function (ShellView) {
        var shell = new ShellView(null, dom.byId("root"));
    });
});
```

The main module above loads the basic modules, including dojo/text and dojo/i18n. Their dynamic fields are set to false, and then call is made to require to load pull in the application loader. By doing this in a two-step process, we can be sure that the dojo/text and dojo/i18n modules are properly configured before the application tries to make use of it.

The rest isn't so complicated, I promise...

The third line:
```ts
/// <amd-dependency path="dijit/form/TextBox" />
```

is another amd-dependency call that will load a dijit/form/CheckBox. Presumeably, this control is used in the templated widget and, therefore, needs to be preloaded. Since we don't need access to it in the module, we load it this way. If we tried to use an "import" statement, the TypeScript compiler would recognize that we don't use the dependency in the module and would optimize it away.

The next four lines:
```ts
import dojoDeclare = require("dojo/_base/declare");
import _WidgetBase = require("dijit/_WidgetBase");
import _TemplatedMixin = require("dijit/_TemplatedMixin");
import _WidgetsInTemplateMixin = require("dijit/_WidgetsInTemplateMixin");
```
are simple requests for the AMD loader to pull in the Dojo modules that we need for the widget. All of Dojo's conventions (including relative module paths) can be used here. Notice that the dojo/_base/declare module is called "dojoDeclare"; this was done to prevent a conflict with TypeScript's "declare" keyword.

The following is the class definition:
```ts
class Foo extends dijit._WidgetBase {
    constructor(args?: Object, elem?: HTMLElement) {
        return new Foo_(args, elem);
        super();
    }

    res: any;

    myArray: string[];

    sayHello(): void {
        alert(res.message.helloTypeScript);
    }
}
```

There are only three odd things going on here. 

The first is the constructor function which has a "return" statement. This means that the returned value will be used instead of a new "Foo" object. This allows us to defer to the Dojo class declaration and return that object. Also notice that we pass the arguments through to the Dojo class so that it has all of the information that it needs to properly construct the widget.

The second odd thing is the call to super() after the return statement in the constuctor. This is just there to make the TypeScript compiler happy since it requires this whenever a class inherits from a base class (dijit._WidgetBase in this case). Since it occurs after the return statement, it is never called, but I won't tell if you don't :).

The third odd thing is more subtle: the myArray field is declared, but never initialized. Normally, the constructor should initialize this. However, we are defering to the Dojo classes constructor. It will take the responsibility of inititializing the array.

The final part of the module is this:

```ts
var Foo_ = dojoDeclare("", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], (function (Source: any) {
    var result: any = {};
	result.templateString = template;
	result.res = res;
    result.constructor = function () {
        this.myArray = [];
    }
    for (var i in Source.prototype) {
        if (i !== "constructor" && Source.prototype.hasOwnProperty(i)) {
            result[i] = Source.prototype[i];
        }
    }
    return result;
} (Foo)));
```

You'll notice that the third argument to dojoDeclare is not an object literal, like you might expect. Rather, a self-executing function is used to dynamically generate the object literal. The templateString and res fields are manually set to equal the resources that were required above. Additionally, a constructor function is added to initialize the myArray array. Finally, the Foo class's prototype is inspected and all of its "ownProperties" are added. This allows the Foo class to evolved and its methods will automatically be mapped to the Dojo class. 

Mind blown? Let's try to look at it this way:

Dojo expects things to work in a certain way and that way, in general, is fine. What we want TypeScript for is the strong typing. In order to get both, we are using a Dojo class, but implementing it in the context of a TypeScript one.

The fact that the TypeScript class defers to the Dojo one means that we get a Dojo class instead of a TypeScript one. This means that everything that we do in the TypeScript class itself is really meaningless since it will be the Dojo class that we are working with. Here is the trick: we define the methods in the TypeScript class which provides the strong typing that we are looking for. We then point the Dojo class's methods to those implementations. In short, we are still using Dojo classes all the way down, but we implement the methods in a TypeScript class so that we get compiler and IDE support.

Please submit any improvements to this technique. It isn't the prettiest thing ever, but it does accomplish the goal of integrating TypeScript and Dojo together. 