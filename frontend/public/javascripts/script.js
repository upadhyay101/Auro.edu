// Get access to the camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
        let videoElement = document.getElementById('videoElement');
        videoElement.srcObject = stream;
    })
    .catch(function(err) {
        console.log("Error accessing the camera: " + err);
    });
