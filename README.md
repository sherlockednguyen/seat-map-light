seat-map-light
==================

This is an AngularJS directive for seat map component. It's named seat-map-light because it only allow to see 1 cabin (of a deck) at a time.

Requirements
-------
- Angular JS
- Angular Material (tested with 1.0.1)
- Google material icon

Install
-------

> bower install https://github.com/sherlockednguyen/seat-map-light.git#1.0.0

Include it into index.html

```html
<script src="bower_components/seat-map-light/seat-map-light.directive.js"></script>
```

then add `directive.seatmap` into app dependencies

```javascript
    angular.module('mymodule',
        [
            //...
     
            'directive.seatmap',
            
            //...
        ])
```

Usage
-----

#HTML

```html
    <seat-map-light
        data-config="config"
        data-legends="seatLegends"
        data-decks-data="decksData"
        data-selected-nodes="selectedNodes"
        data-on-select-node="onSelectNode($node)"
        data-max-seat-select="maxSeatSelect"
        data-on-selected="onNodeSelectUnSelect($node)"
        reset-seatmap="reset"
        reload-seatmap="reload"
    >
    </seat-map-light>
```

#Option:
- config {object} store seat map config value
    + canvasWidth {integer} canvas width in pixel
    + isShowRowLabel {boolean} whether to show row label
- legends {Array[{**legendObject**}]} array of facility legends
    + legendObject: 
        * code {String} legend code (will be image subfix)
        * text {String} legend description
- maxSeatSelect {integer=} maximum of seat that can be selected. Default 1
- onSelected {function} function to trigger when a node is selected ($node)
- resetSeatmap {function} api to force reset seatmap
- reloadSeatmap {function} api to force reload seatmap
- decksData {Array[{**deckObject**}]} array of decks. 
    + deckObject:
        * displayName {String} deck's display name to show in deck button
        * cabins {Array[{**cabinObject**}]} array of cabins
    + cabinObject
        * clazz {String} cabin class code (*Y*, *J*, *F*)
        * columns {Array[{**columnObject**}]} array of columns
        * columns {Array[{**rowObject**}]} array of rows
    + columnObject
        * columnName {String} column name to display
        * isDisplay {boolean=} whether to show column name. Default false.
    + rowObject
        * rowNumber {String=} row number to display
        * nodes {Array[{**nodeObject**}]} array of nodes
    + nodeObject
        * type {String=} node type ('FACILITY'/'SEAT'). Only mandatory if node is not empty
        * isEmptyNode {boolean} whether it's a empty node. Default is false
        * state {String=} node state (for **SEAT** only) *AVAIABLE*/*HIGHLIGHT*/*RESERVED*/CHECKEDIN*/*BOARDED*. Default *AVAIABLE*
        * rowSpan {integer=} number of row that node span. Default is 1
        * characteristic {Array[{**characteristicObject**}]=} array of characteristic. Only mandatory if node **is SEAT**
    + characteristicObject
        * code {String} characteristic code
