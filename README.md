Angular UI Tree
======================

angular-ui-tree-select is an AngularJS UI component based on angular-ui-tree. It support select and filter feature for angular-ui-tree.


## Features

- Based on angular-ui-tree
- Filter and highlight tree data, auto expand and close nodes
- autocomplete when press enter button

## Supported browsers

The Angular UI Tree is tested with the following browsers:

- Chrome (stable)
- Firefox
- IE 8, 9 and 10

For IE8 support, make sure you do the following:

- include an [ES5 shim](https://github.com/es-shims/es5-shim)
- make your [AngularJS application compatible with Internet Explorer](http://docs.angularjs.org/guide/ie)
- use [jQuery 1.x](http://jquery.com/browser-support/)

## Demo

- clone repo
- cd dummy && bower install ../../angular-ui-tree-select
- run `http-server`

## Requirements

- Angularjs
- jQuery
- jspath
- lodash
- angular-ui-tree

## Usage

```
<ui-tree-select tree-model="defaultLocations"
  node-id="uuid"
  node-children="children"
  node-label="name"
  position="absolute"
  class-name="tree-select-picker__custom"
  node-path="path"
  use-node-path="true"
  bind="activity.location">
</ui-tree-select>
```

- node-id: the name of node's primary key, if you want to sync datas with backend, this property is required
- node-children: the children name of nested datas
- node-label: read this property of node and draw it on select plugin
- position: absolute or relative, if absolute, you should add custom class to define position yourself
- class-name: custom styles
- node-path: specify the node path property
- use-node-path: when true, node-path value will be set when press enter
- bind: bind with model
