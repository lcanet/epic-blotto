angular.module('epicBlotto').filter('diffLabel', function(){
    return function(step) {
        if (!step) return '';
        return '+ ' + step.verticalPositive.toFixed(0) + ' / - ' + step.verticalNegative.toFixed(0);
    }
});