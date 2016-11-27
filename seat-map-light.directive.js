(function () {
	"use strict";

	angular.module('SherlockedCustomDirective', ['ngMaterial'])
		.constant('seatMapLightConstant', {
			IS_TESTING: false,
			COLUMN_ROW_TEXT_FONT: 'sans-serif',
			COLUMN_ROW_TEXT_SIZE: 13,
			COLUMN_ROW_TEXT_COLOR: '#000000',
			ROW_LABEL_COLOR: '#000000',
			ROW_LABEL_FONTSIZE: 13,
			ROW_LABEL_FONT: 'sans-serif',
			ECONOMY_CLASS: 'Y',
			BUSINESS_CLASS: 'J',
			FIRST_CLASS: 'F',
			ECONOMY_CLASS_ROW_HEIGHT: 45,
			BUSINESS_CLASS_ROW_HEIGHT: 55,
			FIRST_CLASS_ROW_HEIGHT: 65,
			SEPARATION_X_PERCENT: 0.1,
			SEPARATION_Y_PERCENT: 0.1,
			FACILITY_PREFIX: 'FACILITY',
			SEAT_PREFIX: 'SEAT',
			EXIT_GATE_CODE: 'E',
			WINGS_CODE: 'W',
			BULK_HEAD_COLOR: '#D8D8D8',
			BULK_HEAD_DIVISOR: 4,
			LEFT_WING_STROKE_COLOR: '#ECF7FF',
			LEFT_WING_FILL_COLOR: '#ECF7FF',
			RIGHT_WING_STROKE_COLOR: '#ECF7FF',
			RIGHT_WING_FILL_COLOR: '#ECF7FF',
			WING_SKEW: 10,
			STATES: {
				CHECKEDIN: 'CHECKEDIN',
				BOARDED: 'BOARDED',
				AVAILABLE: 'AVAILABLE',
				RESERVED: 'RESERVED',
				SELECTED: 'SELECTED'
			},
			CHARACTERISTIC_CODE: {
				BULK_HEAD: 'BH',
				BASINET: 'BB',
				EMERGENCY_EXIT_GATE: 'EE',
			},
			CHARACTERISTIC_SUBFIX: {
				BASINET: 'BASINETAVAILABLE',
				EMERGENCY_EXIT_GATE: 'EXITAVAIlABLE',
			},
			IS_SELECTED_SUBFIX: 'SELECTED',
			SPAN_NODE_BORDER_COLOR: '#327aef'
		})
		.directive('seatMapLight', seatMapLight);

	seatMapLight.$inject = ['$timeout'];

	function seatMapLight($timeout) {
		return {
			restrict: 'E',
			templateUrl: 'seat-map-light/seat-map-light.tmpl.html',
			scope:
			{
				config: '=',
				decksData: '=',
				selectedNodes: '=',
				onSelectNode: '&',
				legends: '=',
				seatDetails: '=',
				maxSeatSelect: '=',
				onSelected: '&'
				// onRefresh: '&',
			},
			controller: SeatMapLightController,
			controllerAs: 'vm',
			bindToController: true,
			link: function (scope, element, attrs, ctrl) {
				scope.element = element;
				scope.$watch('vm.decksData', function (newVal, oldVal) {
					//only activate if have decks data (legends and seatDetails also there at the same time)
					//TODO handle case change decks data (change segments, ...)
					if(newVal){
						ctrl.activate();
					}
				});
			}
		}
	};

	//Controller section starts
	SeatMapLightController.$inject = ['$scope', '$timeout', '$mdDialog', 'seatMapLightConstant'];

	function SeatMapLightController($scope, $timeout, $mdDialog, seatMapLightConstant) {
		var vm = this,
			constant = seatMapLightConstant,
			_paintedCanvas = {};	//Ex: {1: [J,Y,F], 2:[F]};

		vm.decksSetting = [];
		vm.currentActive = { deck: 0, clazz: 'Y'};
		vm.fabToolbar = { isOpen: false}
		//expose controller methods
		vm.activate = activate;
		vm.onSelectDeck = onSelectDeck;
		vm.onSelectCabin = onSelectCabin;
		vm.openLegendBottomSheet = openLegendBottomSheet;


		//If decks data get from server, should wait for it.
		function activate(){
			// console.log('$scope', $scope);
			// console.log('vm.config', vm.config);
			// console.log('vm.decksData', vm.decksData);
			// console.log('vm.seatDetails', vm.seatDetails);
			// console.log('vm.legends', vm.legends);
			// console.log('vm.maxSeatSelect', vm.maxSeatSelect);
			// console.log('vm.selectedNodes', vm.selectedNodes);

			vm.config.iconLocation = vm.config.iconLocation || 'seat-map-light/images/icons/';
			vm.config.maxSelect = vm.config.maxSelect || 1;
			//Init canvases height
			vm.decksData.forEach(function(deck, index){
				var setting = calculateCanvasesHeight(deck);
				setting.displayName = deck.displayName;
				vm.decksSetting.push(setting);
			});

			$timeout(function(){//wait for canvas to be render in view after have decksSetting data
				//TODO check if want to draw all canvas here at the begining
				drawCabin(vm.currentActive.deck, vm.currentActive.clazz);
				_paintedCanvas[vm.currentActive.deck] = [vm.currentActive.clazz];
			});
		}

		function getCabinSetting(deckIndex, clazz){
			for(var i = 0; i < vm.decksSetting[deckIndex].length; i++){
				if(vm.decksSetting[deckIndex][i].clazz === clazz){
					return vm.decksSetting[deckIndex][i];
				}
			}
			throw new Error('Can not find cabin setting');
		}

		function getCabinData(deckIndex, clazz){
			for(var i = 0; i < vm.decksData[deckIndex].cabins.length; i++){
				var cabin = vm.decksData[deckIndex].cabins[i];
				if(cabin.clazz === clazz){
					return cabin;
				}
			}

			throw new Error('Can not find cabin data');
		}

		function getCanvas(deckIndex, clazz) {
			var id = 'seat-map-light-deck-' + deckIndex + '-cabin-' + clazz,
				canvas = document.getElementById(id);
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			return canvas;
		};

		function calculateCanvasesHeight(deck){
			var result = [];
			deck.cabins.forEach(function(cabin){
				var canvasStructure = getCanvasStructure(cabin);
				result.push({
					clazz: cabin.clazz,
					heightInfo: canvasStructure.heightInfo,
					structure: canvasStructure.structure,
					interactiveNodes: []
				});
			});
			return result;
		}

		function getCanvasStructure(cabin){
			var rowHeight = 0,height = 0,
				additionalHeight = 0;
			switch(cabin.clazz){
				case constant.ECONOMY_CLASS:
					rowHeight = constant.ECONOMY_CLASS_ROW_HEIGHT;
					break;
				case constant.BUSINESS_CLASS:
					rowHeight = constant.BUSINESS_CLASS_ROW_HEIGHT;
					break;
				case constant.FIRST_CLASS:
					rowHeight = constant.FIRST_CLASS_ROW_HEIGHT;
					break;
			}

			var numBulkHeadRow = 0;
			for(var i =0; i < cabin.rows.length; i++){
				if(isRowHaveCharacteristic(cabin.rows[i], constant.CHARACTERISTIC_CODE.BULK_HEAD)){
					additionalHeight += Math.ceil(rowHeight/constant.BULK_HEAD_DIVISOR);
				}
				height += rowHeight;
			}

			var noOfColumn = cabin.columns.length;
			//2 Empty separation columns, 2 colum for row number in left + right
			noOfColumn += 4;

			var numberOfSeparationX = noOfColumn - 1;
			var numberOfSeparationY = cabin.rows.length - 1;
			var totalSeparationSpaceX = vm.config.canvasWidth * constant.SEPARATION_X_PERCENT;
			var totalSeparationSpaceY = (height + additionalHeight)
									 * constant.SEPARATION_Y_PERCENT;

			return  {
				heightInfo: { height: height, additionalHeight: additionalHeight, totalSeparationSpaceY: totalSeparationSpaceY},
				structure: {
					eachSeparationX: totalSeparationSpaceX / numberOfSeparationX,
					eachSeparationY: totalSeparationSpaceY / numberOfSeparationY,
					eachSquare: {
						width: (vm.config.canvasWidth  - totalSeparationSpaceX) / noOfColumn,
						height: height / cabin.rows.length
					}
				}
			}
		}

		function drawCabin(deckIndex, clazz){
			var cabinData = getCabinData(deckIndex, clazz),
				cabinSetting = getCabinSetting(deckIndex, clazz),
				canvas = getCanvas(deckIndex, clazz);

			drawCabinColumns(cabinData.columns, deckIndex, clazz);

			drawWings(canvas, cabinData, cabinSetting);

			drawRows(canvas, cabinData, cabinSetting, clazz);

			addClickEventToCanvas(canvas);
		}

		function addClickEventToCanvas(canvas) {
            canvas.addEventListener('click', onCanvasClick, false);
		}

		function drawWings(canvas, cabinData, cabinSetting){
			var wings = {}, isWingsExists = false,
				structure = cabinSetting.structure,
				lastUp = constant.WING_SKEW;	//our cursor Y position

			for(var i = 0; i < cabinData.rows.length; i++){
				var row = cabinData.rows[i];
				if(!isWingsExists && isRowHaveCharacteristic(row, constant.WINGS_CODE)){
					//find the start of wings
					wings.leftStartX = 0;
					wings.leftStartY = lastUp;
					wings.rightStartX =
						//1 square, 1 separation * total columns
						//+ 2 empty columns left right + 1 left rowNumber column
						((structure.eachSeparationX + structure.eachSquare.width) * (cabinData.columns.length))
							+ 3*(structure.eachSeparationX + structure.eachSquare.width);
					wings.rightStartY = lastUp;
					isWingsExists = true;
				} else if(isWingsExists && !isRowHaveCharacteristic(row, constant.WINGS_CODE)){
					//Find the end of wings
					wings.leftEndX = 0;
					wings.leftEndY = lastUp - 2 * constant.WING_SKEW - structure.eachSeparationX;
					wings.rightEndX =
						((structure.eachSeparationX + structure.eachSquare.width) * (cabinData.columns.length))
							+ 3*(structure.eachSeparationX + structure.eachSquare.width);
					wings.rightEndY = lastUp - 2 * constant.WING_SKEW - structure.eachSeparationX;
					break;
				}

				//increase Y cursor lastUp
				if(isRowHaveCharacteristic(row, constant.CHARACTERISTIC_CODE.BULK_HEAD)){	//bulk head row is higher than normal row
					lastUp = lastUp + structure.eachSquare.height/constant.BULK_HEAD_DIVISOR;
				}
				lastUp = lastUp + structure.eachSquare.height + structure.eachSeparationY;
			}

			drawWingToCanvas(canvas, wings, cabinSetting);
		}

		function isRowHaveCharacteristic(row, character){
			for(var i = 0; i < row.nodes.length; i++){
				for(var j = 0; !isEmptyNode(row.nodes[i]) && j < row.nodes[i].characteristic.length; j++){
					if(row.nodes[i].characteristic[j].code === character){
						return true;
						}
				}
			}
			return false;
		}

		function isNodeHaveCharacteristic(node, character){
			for(var j = 0; !isEmptyNode(node) && j < node.characteristic.length; j++){
				if(node.characteristic[j].code === character){
					return true;
					}
			}
			return false;
		}



		function isEmptyNode(node){
			return !!node.isEmptyNode && node.isEmptyNode === true;
		}

		function drawWingToCanvas(canvas, wings, cabinSetting){
			var squareWidth = cabinSetting.structure.eachSquare.width;
			if(wings.leftStartX !== undefined){
				//Left wing
				var context = canvas.getContext('2d');
				context.beginPath();
				context.moveTo(wings.leftStartX, wings.leftStartY);
				context.lineTo(wings.leftEndX, wings.leftEndY);
				context.lineTo(wings.leftEndX + squareWidth, wings.leftEndY + constant.WING_SKEW);
				context.lineTo(wings.leftEndX + squareWidth, wings.leftStartY - constant.WING_SKEW);
				context.closePath();
				context.strokeStyle = constant.LEFT_WING_STROKE_COLOR;
			    context.stroke();
			    context.fillStyle = constant.LEFT_WING_FILL_COLOR;
			    context.fill();

				//Right wing
				var context = canvas.getContext('2d');
				context.beginPath();
				context.moveTo(wings.rightStartX, wings.rightStartY - constant.WING_SKEW);
				context.lineTo(wings.rightEndX, wings.rightEndY + constant.WING_SKEW);
				context.lineTo(wings.rightEndX + squareWidth, wings.rightEndY);
				context.lineTo(wings.rightEndX + squareWidth, wings.rightStartY);
				context.closePath();
				context.strokeStyle = constant.RIGHT_WING_STROKE_COLOR;
			    context.stroke();
			    context.fillStyle = constant.RIGHT_WING_FILL_COLOR;
			    context.fill();
			}
		}


		function drawCabinColumns(columns, deckIndex, clazz){
			var id = 'seat-map-light-deck-' + deckIndex + '-cabin-' + clazz + '-column',
				lastUpX,	//cursor X position
				cabinSetting = getCabinSetting(deckIndex, clazz),
				structure = cabinSetting.structure,
				canvas = document.getElementById(id);
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			lastUpX = 2 * (structure.eachSeparationX + structure.eachSquare.width);

			for(var i = 0; i < columns.length; i++){
				var column = columns[i];
				if(column.isDisplay){
                    var boxCentrePointX = lastUpX + structure.eachSquare.width/2;

                    ctx.fillStyle = constant.COLUMN_ROW_TEXT_COLOR;
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold ' + constant.COLUMN_ROW_TEXT_SIZE + 'px ' + constant.COLUMN_ROW_TEXT_FONT;
                    ctx.fillText(column.columnName, boxCentrePointX, 11);
				}
				lastUpX = lastUpX + structure.eachSeparationX
            			 + structure.eachSquare.width;
			}

			//TEST
			if(constant.IS_TESTING){
				var lastUpX = 0;
				for(var i = 0; i < columns.length + 4; i++){
					ctx.beginPath();
					ctx.moveTo(lastUpX, 0);
					ctx.lineTo(lastUpX + structure.eachSquare.width, 0);
					ctx.lineTo(lastUpX + structure.eachSquare.width, 20);
					ctx.lineTo(lastUpX, 20);
					ctx.closePath();
					ctx.strokeStyle = '#000';
				    ctx.stroke();
				    lastUpX += structure.eachSquare.width;

				    ctx.beginPath();
					ctx.moveTo(lastUpX, 0);
					ctx.lineTo(lastUpX + structure.eachSeparationX, 0);
					ctx.lineTo(lastUpX + structure.eachSeparationX, 20);
					ctx.lineTo(lastUpX, 20);
					ctx.closePath();
					ctx.strokeStyle = 'red';
				    ctx.stroke();
				    lastUpX += structure.eachSeparationX;
				}
			}
		}

		function prepareSeatLegendsData() {
			// for (var i = 0; i < vm.legends.length; i++) {
			// 	var legend = vm.legends[i];
			// 	if (legend.category != 'Facility') {
			// 		var image = legend.category + '-' + clazz;
			// 		if (legend.code.lastIndexOf('accepted') > -1)
			// 			image = image + '-chkin';
			// 		else if (legend.code.lastIndexOf('boarded') > -1)
			// 			image = image + '-$';
			// 		else if (legend.code.lastIndexOf('available') > -1)
			// 			image = image + '-X';
			// 		else if (legend.code.lastIndexOf('reserved') > -1)
			// 			image = image + '-O';
			// 		else if (legend.code.lastIndexOf('selected') > -1)
			// 			image = image + '-select';
			// 		else
			// 			image = image + '-X';
			// 		if (legend.abbreviation != '') {
			// 			image = image + '-' + legend.abbreviation;
			// 		}
			// 		vm.legends[i].image = image;
			// 	}
			// 	else {
			// 		vm.legends[i].image = legend.category + '-' + legend.abbreviation;
			// 		if(legend.abbreviation == 'E'){
			// 			vm.legends[i].image = vm.legends[i].image + '-R';
			// 		}
			// 	}
			// }
		}

		function drawRows(canvas, cabinData, cabinSetting, clazz){
			var lastUpY = 0; //cursor position Y - increase row by row
			for (var i = 0; i < cabinData.rows.length; ++i) {
				lastUpY = drawRow(cabinData.rows[i], lastUpY, canvas, cabinData, cabinSetting, clazz);
				lastUpY += cabinSetting.structure.eachSeparationY;

				//TEST
				if(constant.IS_TESTING){
					var ctx = canvas.getContext('2d');
					ctx.beginPath();
					ctx.moveTo(0, lastUpY - cabinSetting.structure.eachSeparationY);
					ctx.lineTo(vm.config.canvasWidth, lastUpY - cabinSetting.structure.eachSeparationY);
					ctx.closePath();
					ctx.strokeStyle = '#000';
				    ctx.stroke();

				    ctx.beginPath();
					ctx.moveTo(0, lastUpY);
					ctx.lineTo(vm.config.canvasWidth, lastUpY);
					ctx.closePath();
					ctx.strokeStyle = 'red';
				    ctx.stroke();
				}

			}
		}

		function drawRow(row, lastUpY, canvas, cabinData, cabinSetting, clazz){
			var structure = cabinSetting.structure,
				width = structure.eachSquare.width,
				height = structure.eachSquare.height,
				lastUpX = 2*(structure.eachSquare.width + structure.eachSeparationX);

        	lastUpY = drawBulkHead(row, canvas, lastUpY, cabinSetting);

        	if(isRowHaveCharacteristic(row, constant.EXIT_GATE_CODE)) {
        		drawExitGates(canvas, cabinData.columns.length, structure, lastUpY);
        	}

            if (vm.config.isShowRowLabel && row.rowNumber !== undefined && row.rowNumber !== null) {
                drawRowLabels(canvas, structure, cabinData.columns.length, String(row.rowNumber), lastUpY);
            }

            for (var i = 0; i < row.nodes.length; ++i) {
				var node = row.nodes[i];

                if (!isEmptyNode(node)) {
                	var imageName, isSeat;

                	//If node is not empty, must have type as FACILITY or SEAT
					var nodeType = node.type.toUpperCase();
					if(nodeType === constant.FACILITY_PREFIX){
						imageName =  getFacilityImageName(node);
						isSeat = false;
					} else {	//SEAT
						imageName =  getSeatImageName(node, clazz);
						isSeat = true;
					}

                	//TODO, implement heightSpan
                	var rowSpanLastUpX = lastUpX;
                	var spanBorder = undefined;
                	if(node.rowSpan && !isNaN(node.rowSpan)){
                		// calculate rowSpanLastUpX for rowSpan
                		var rowSpan = Number(node.rowSpan);
                		rowSpanLastUpX = rowSpanLastUpX +  (rowSpan - 1) * (structure.eachSquare.width + structure.eachSeparationX)/2;
                		if(node.isHaveBorder){
                			spanBorder = {
                				x: lastUpX,
                				y: lastUpY,
                				width: rowSpan * (structure.eachSquare.width + structure.eachSeparationX) - structure.eachSeparationX,
                				height: height
                			};
                		}

                		lastUpX += (rowSpan - 1) * (structure.eachSquare.width + structure.eachSeparationX);
                	}

                	drawNode(canvas, imageName, rowSpanLastUpX, lastUpY, width, height, true, spanBorder);

                	if(isSeat){	//Only able to interact with seat
	                    var nodeInfo = {
								node: node,
								x: rowSpanLastUpX,
								y: lastUpY,
								width: structure.eachSquare.width,
								height: structure.eachSquare.height
							};
						cabinSetting.interactiveNodes.push(nodeInfo);
					}
                }
                lastUpX = lastUpX + structure.eachSquare.width + structure.eachSeparationX;
            }

            return lastUpY + structure.eachSquare.height;
		}

		function drawBulkHead(row, canvas, lastUpY, cabinSetting){
			var structure = cabinSetting.structure;
			var lastUpX = 2 * (structure.eachSeparationX + structure.eachSquare.width);
			var bulkHeads = [];
			var start = null;
			var end = null;
			for(var i = 0; i < row.nodes.length; i++){
				var node = row.nodes[i];
				if(start === null){
					for(var j = 0; !isEmptyNode(node) && j < node.characteristic.length; j++){
						if(node.characteristic[j].code === 'BH'){
							start = lastUpX;
							break;
						}
					}
				}

				if(start != null && isEmptyNode(node)){
					end = lastUpX - structure.eachSeparationX;
					bulkHeads.push(start + '|' + end);
					start = null;
				}

				if(start != null && i === row.nodes.length -1){
					end = lastUpX + structure.eachSquare.width;
					bulkHeads.push(start + '|' + end);
					start = null;
				}

				//rowSpan also affect bulk head
            	if(node.rowSpan && !isNaN(node.rowSpan)){
            		lastUpX += (Number(node.rowSpan) - 1) * (structure.eachSquare.width + structure.eachSeparationX);
            	}

				lastUpX = lastUpX + structure.eachSeparationX + structure.eachSquare.width;
			}

			if(bulkHeads.length === 0){
				return lastUpY;
			}

			var ctx = canvas.getContext('2d');
			for(var i = 0; i < bulkHeads.length; i++){
				var bh = bulkHeads[i].split('|');
				ctx.beginPath();
				ctx.moveTo(bh[0], lastUpY);
				ctx.lineTo(bh[1], lastUpY);
				ctx.closePath();
				ctx.strokeStyle = constant.BULK_HEAD_COLOR;
			    ctx.stroke();
			}
			return lastUpY + structure.eachSquare.height/constant.BULK_HEAD_DIVISOR;
		}

		function drawExitGates(canvas, noOfColumn, structure, yPos){
			var height = structure.eachSquare.height,
				width = structure.eachSquare.width;
            var exitLeftX = structure.eachSquare.width + structure.eachSeparationX;
            var exitRightX = 2*(structure.eachSquare.width + structure.eachSeparationX)
            		+ noOfColumn * (structure.eachSquare.width + structure.eachSeparationX);

            drawExitGate(canvas, 'L', exitLeftX, yPos, width, height);
            drawExitGate(canvas, 'R', exitRightX, yPos, width, height);
		}

		function drawExitGate(canvas, direction, xPos, yPos, width, height){
			var imageName = constant.FACILITY_PREFIX + '-' + constant.EXIT_GATE_CODE + '-' + direction;
        	drawNode(canvas, imageName, xPos, yPos, width, height, true);
		}

		function drawRowLabels(canvas, structure, noOfColumn, rowLabel, yPos){
			var height = structure.eachSquare.height,
				width = structure.eachSquare.width;
            var leftX = 0;
            var rightX = 3*(structure.eachSquare.width + structure.eachSeparationX)
            		+ noOfColumn * (structure.eachSquare.width + structure.eachSeparationX);

            drawRowLabel(canvas, rowLabel, leftX, yPos, width, height);
            drawRowLabel(canvas, rowLabel, rightX, yPos, width, height);

		}

		function drawRowLabel(canvas, rowlabel, xPos, yPos, width, height){
			var ctx = canvas.getContext('2d');

			ctx.fillStyle = constant.ROW_LABEL_COLOR;

			ctx.textAlign = 'center';
			ctx.font = Math.floor(height/2) + 'px ' + constant.ROW_LABEL_FONT;
			ctx.fillText(rowlabel, xPos + width/2, yPos + height/2 + 7);	//+7 tweak for v center label

		}

		function getFacilityImageName(node){
			var subfix;

			for(var i = 0; i < vm.legends.length; i++){
				var legend = vm.legends[i];
				if (legend.category === 'FACILITY' &&
					isNodeHaveCharacteristic(node, legend.code)) {
						subfix = legend.code;
						break;
				}
			}
			return constant.FACILITY_PREFIX + '-' + subfix;
		}

		function getSeatImageName(node, clazz){
			//For now, easy implement first.
			//Seat pattern:
			//SEAT-<class>-<state>[-<first priority characteristic>[-OUTLINED]]
			//	- class: F(first), J (Business), Y (Economy)
			//	- state: AVAIABLE/HIGHLIGHT/RESERVED/CHECKEDIN/BOARDED/ERROR
			//	- [-<characteristic>]: for now
			//	- [-SELECTED]: Whether icon have outline.
			//	Ex: SEAT-Y-HIGHLIGHT-BASINETAVAIABLE-OUTLINED, SEAT-Y-CHECKEDIN-EXITAVAIABLE
			//		SEAT-F-CHECKEDIN-EXITAVAIABLE, SEAT-J-SELECTED
			var subfix = '-' + (node.state || constant.STATES.AVAILABLE);
			var characteristicCode = getMostPriorityCharacteristicCode(node);
			subfix += characteristicCode? '-' + characteristicCode: '';
			subfix += !!node.isSelected ? '-' + constant.IS_SELECTED_SUBFIX: '';

			return constant.SEAT_PREFIX + '-' + clazz.toUpperCase() + subfix;
		}

		function getMostPriorityCharacteristicCode(node){
			if(isNodeHaveCharacteristic(node, constant.CHARACTERISTIC_CODE.BASINET)){
				return constant.CHARACTERISTIC_SUBFIX.BASINET;
			}

			if(isNodeHaveCharacteristic(node, constant.CHARACTERISTIC_CODE.EMERGENCY_EXIT_GATE)){
				return constant.CHARACTERISTIC_SUBFIX.EMERGENCY_EXIT_GATE;
			}
		}

		function clearNode(canvas, x, y, width, height){
			canvas.getContext('2d').clearRect(x, y, width, height);
		}


		function drawNode(canvas, imageName, xPos, yPos, width, height, isCenter, spanBorder) {
			var img = document.createElement('img');
			img.src = vm.config.iconLocation + imageName + '.png';

			img.onload = function () {
				var ctx = canvas.getContext('2d');
				//Draw border for span node
				if(spanBorder){
					//calculate origin of xPos, yPost, heigh, width base on widthOfSpanBorder
					ctx.beginPath();
					ctx.setLineDash([5, 5]);
					ctx.moveTo(spanBorder.x, spanBorder.y);
					ctx.lineTo(spanBorder.x + spanBorder.width, spanBorder.y);
					ctx.lineTo(spanBorder.x + spanBorder.width, spanBorder.y + spanBorder.height);
					ctx.lineTo(spanBorder.x,  spanBorder.y + spanBorder.height);
					ctx.closePath();
					ctx.strokeStyle = constant.SPAN_NODE_BORDER_COLOR;
				    ctx.stroke();
				}

				//TODO update function below to ctx.drawImage(image, dx, dy, dWidth, dHeight);
				//As when $scope.settings.canvasWidth increase the below command will not
				//increase image size
				if(!!isCenter){
					var imgWidth = this.width,
						imgHeight = this.height;

					xPos += (width - imgWidth)/2;
					yPos += (height - imgHeight)/2;
					width = imgWidth;
					height = imgHeight;

					// xPos += width/4;
					// yPos += height/4;
					// width /= 2;
					// height /= 2;
				}
				ctx.drawImage(img, xPos, yPos, width, height);
            }
		}

		function onCanvasClick(event) {
			var canvas = event.target;
			var x = event.offsetX;
			var y = event.offsetY;

			var structure = getCabinSetting(vm.currentActive.deck, vm.currentActive.clazz).structure;
			var nodes = getCabinSetting(vm.currentActive.deck, vm.currentActive.clazz).interactiveNodes;
			var seatData = getCabinData(vm.currentActive.deck, vm.currentActive.clazz);

			for (var i = 0; i < nodes.length; i++) {
				var clickedNode = nodes[i];
				var minX = clickedNode.x;
				var maxX = clickedNode.x + clickedNode.width;
				var minY = clickedNode.y;
				var maxY = clickedNode.y + clickedNode.height;

				var isInBox = (x > minX && x < maxX) && (y > minY && y < maxY);

				if (isInBox) {
					var needChangeNode = false;
					if (!!clickedNode.node.isSelected) {
						//What should be done when node is unselected
						needChangeNode = true;
					} else {
						//What should be done when node is selected
						var numOfSelectedNode = getNumOfSelectedNodes();
						if(numOfSelectedNode < vm.config.maxSelect){
							needChangeNode = true;
						}
					}

					if(needChangeNode){
						var prevImageName = getSeatImageName(clickedNode.node, vm.currentActive.clazz);
						clickedNode.node.isSelected = !!!clickedNode.node.isSelected;
						var imageName = getSeatImageName(clickedNode.node, vm.currentActive.clazz);

						//TODO add colSpan feature
						var xPos = clickedNode.x;
						if(clickedNode.node.rowSpan && !isNaN(clickedNode.node.rowSpan)){
	                		// calculate lastUpX for rowSpan
	                		xPos = xPos +  (Number(clickedNode.node.rowSpan) - 1)
	                				* (structure.eachSquare.width + structure.eachSeparationX)/2;
	                	}

						clearNode(canvas, xPos, clickedNode.y, clickedNode.width, clickedNode.height);
						drawNode(canvas, imageName, xPos, clickedNode.y,
							clickedNode.width, clickedNode.height, true);

						vm.onSelected({ "$node": clickedNode.node });
						$scope.$apply();
					}
				}
			}
		}

		function getNumOfSelectedNodes(){
			var cabinData = getCabinData(vm.currentActive.deck, vm.currentActive.clazz);
			var num = 0;
			cabinData.rows.forEach(function(row){
				row.nodes.forEach(function(node){
					num += !!node.isSelected ? 1 : 0;
				});
			});
			return num;
		}

		function onSelectDeck(index){
			vm.currentActive.deck = index;
			vm.currentActive.clazz = vm.decksData[index].cabins[0].clazz;
			paintCanvasOnDemand();
		}

		function onSelectCabin(clazz){
			vm.currentActive.clazz = clazz;
			paintCanvasOnDemand();
		}

		function paintCanvasOnDemand(){
			//Paint canvas base on current active if require.
			if(!_paintedCanvas[vm.currentActive.deck]
				|| _paintedCanvas[vm.currentActive.deck].indexOf(vm.currentActive.clazz) < 0){
				//not yet painted
				drawCabin(vm.currentActive.deck, vm.currentActive.clazz);
				if(!_paintedCanvas[vm.currentActive.deck]){
					_paintedCanvas[vm.currentActive.deck] = [];
				}
				_paintedCanvas[vm.currentActive.deck].push(vm.currentActive.clazz);
			}
		}

		function openLegendBottomSheet(){

			var template =
				`<md-dialog aria-label="Seat and facility legends ">
				    <form ng-cloak>
				        <md-toolbar>
				            <div class="md-toolbar-tools">
				                <h2>Legends</h2>
				                <span flex></span>
				                <md-button class="md-icon-button" ng-click="cancel()">
				                    <md-icon aria-label="Close dialog">close</md-icon>
				                </md-button>
				            </div>
				        </md-toolbar>
				        <md-dialog-content>
				            <div class="md-dialog-content">
				            	<div class="legends-container" layout="row" layout-wrap>
					                <span class="legend-item" ng-repeat="legend in legends" flex="20"
					                	style="text-align: center; margin-bottom:35px; position:relative; height: 100px;">
					                  <img ng-src="{{iconLocation}}{{legend.imageName}}.png">
					                  </br>
					                  <span style="bottom: 0; width: 100%; display: block; position: absolute;">{{legend.description}}</span>
					                </span>
				                </div>
				            </div>
				        </md-dialog-content>
				    </form>
				</md-dialog>`
				;

			$mdDialog.show({
				controller: SeatmapLightLegendsController,
				template: template,
				parent: angular.element(document.body),
				locals: {
		      		legendsData: vm.legends,
		      		iconLocation: vm.config.iconLocation
				},
				clickOutsideToClose:true,
				fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
			})
			.then(function(answer) {
				$scope.status = 'You said the information was "' + answer + '".';
			}, function() {
				$scope.status = 'You cancelled the dialog.';
			});
		}

		SeatmapLightLegendsController.$inject = ['$mdDialog', '$scope', 'seatMapLightConstant', 'legendsData', 'iconLocation'];
		function SeatmapLightLegendsController($mdDialog, $scope, seatMapLightConstant, legendsData, iconLocation){

			$scope.cancel = cancel;
			activate()

			function activate(){
				$scope.iconLocation = iconLocation;
				var facilityLegends = getFacilityLegends(legendsData);
				var seatLegends = getSeatLegends();
				$scope.legends = facilityLegends.concat(seatLegends);
			}

			function cancel(){
				$mdDialog.cancel();
			}

			function getSeatLegends(){
				var clazzes = ['Y','J','F'];
				var states = ['AVAILABLE', 'HIGHLIGHT', 'RESERVED', 'CHECKEDIN', 'BOARDED']
				var characteristics = ['', 'BASINETAVAILABLE', 'EXITAVAILABLE']
				var selectSufixes = ['', 'SELECTED'];

				var SEAT_PREFIX = 'SEAT';
				var result = [];
				var map = {};
				clazzes.forEach(clazz => {
					states.forEach(state => {
						characteristics.forEach(characteristic => {
							selectSufixes.forEach(select => {
								var str = SEAT_PREFIX +
									'-' + clazz +
									'-' + state;

								if(characteristic.length > 0){
									str += '-' + characteristic;
								}

								if(select.length > 0 && state != 'ERROR'){
									str += '-' + select;
								}
								map[str] = {
									description: (codeToClass(clazz) + ' ' + capitalizeFirstLetter(state)
										 + ' ' + capitalizeFirstLetter(characteristic) + ' ' + capitalizeFirstLetter(select)).trim(),
									imageName: str
								};
							});
						});
					});
				});
				for(var key in map){
					if(map.hasOwnProperty(key)){
						result.push(map[key]);
					}
				}

				return result;
			}

			function getFacilityLegends(legends){
				var result = [];
				legends.forEach(legend => {
					var imageName = seatMapLightConstant.FACILITY_PREFIX + '-' + legend.code;
					if(legend.code === 'E'){	//Exit have Left and right
						result.push({description: legend.text,imageName: imageName + '-L'});
						result.push({description: legend.text,imageName: imageName + '-R'});
					} else {
						result.push({description: legend.text,imageName: imageName});
					}
				});
				return result;
			}

			function capitalizeFirstLetter(str) {
				if(str){
			    	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
			    } else {
			    	return '';
			    }
			}

			function codeToClass(code){
				switch(code){
					case 'F':
						return "First class";
					case 'J':
						return "Business class";
					case 'Y':
						return "Economy class";
				}
			}

		}
	}
})();

