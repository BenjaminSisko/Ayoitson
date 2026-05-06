module.exports = function ($scope, ayoitson) {
    $scope.version = ""
    $scope.ffmpegVersion = ""
    ayoitson.getVersion().then((version) => {
        $scope.version = version.version;
        $scope.ffmpegVersion = version.ffmpeg;
        $scope.nodejs = version.nodejs;
    })

    
}
