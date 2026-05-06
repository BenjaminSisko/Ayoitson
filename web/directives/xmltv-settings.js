module.exports = function (ayoitson) {
    return {
        restrict: 'E',
        templateUrl: 'templates/xmltv-settings.html',
        replace: true,
        scope: {
        },
        link: function (scope, element, attrs) {
            ayoitson.getXmltvSettings().then((settings) => {
                scope.settings = settings
            })
            scope.updateSettings = (settings) => {
                ayoitson.updateXmltvSettings(settings).then((_settings) => {
                    scope.settings = _settings
                })
            }
            scope.resetSettings = (settings) => {
                ayoitson.resetXmltvSettings(settings).then((_settings) => {
                    scope.settings = _settings
                })
            }
        }
    }
}