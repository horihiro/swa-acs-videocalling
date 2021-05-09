import { CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

let call;
let callAgent;
const calleeInput = document.getElementById("callee-id-input");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const stopVideoButton = document.getElementById("stop-Video");
const startVideoButton = document.getElementById("start-Video");
const selectCameraDialog = document.getElementById("select-Camera");
const callerId = document.getElementById('caller-id');

let placeCallOptions;
let deviceManager;
let localVideoStream;
let rendererLocal;
let rendererRemote;

async function openSelectCameraDialog(videoDevices, onOkHandler) {
  if (videoDevices && videoDevices.length === 1) {
    setImmediate(() => {
      onOkHandler(videoDevices[0]);
    });
    return;
  }

  const selectElement = selectCameraDialog.querySelector("select");
  while (selectElement.childNodes && selectElement.childNodes.length) {
    selectElement.removeChild(selectElement.childNodes[0]);
  }
  videoDevices.forEach((videoDevice) => {
    const cameraOption = document.createElement("option");
    cameraOption.innerText = videoDevice.name;
    selectElement.appendChild(cameraOption);
  });
  const closeHandler = (e) => {
    if (selectCameraDialog.returnValue === "Ok") onOkHandler(videoDevices[selectElement.selectedIndex]);
    selectCameraDialog.removeEventListener("close", closeHandler);
  };
  selectCameraDialog.addEventListener("close", closeHandler);
  selectCameraDialog.showModal();
}

async function init() {
  const callClient = new CallClient();
  console.log(await navigator.mediaDevices.enumerateDevices())
  deviceManager = await callClient.getDeviceManager();
  const credential = {}; // await (await fetch('/api/getToken')).json();
  const tokenCredential = new AzureCommunicationTokenCredential(credential.token);
  callAgent = await callClient.createCallAgent(tokenCredential, { displayName: 'optional ACS user name' });
  callerId.innerText = `Your Id is: ${credential.communicationUserId}`;
  callButton.disabled = false;

  callAgent.on('incomingCall', async e => {
    const videoDevices = await deviceManager.getCameras();
    // const videoDeviceInfo = videoDevices[0];
    openSelectCameraDialog(videoDevices, async (videoDeviceInfo) => {
      localVideoStream = new LocalVideoStream(videoDeviceInfo);
      localVideoView();

      stopVideoButton.disabled = false;
      callButton.disabled = true;
      hangUpButton.disabled = false;

      const addedCall = await e.incomingCall.accept({ videoOptions: { localVideoStreams: [localVideoStream] } });
      call = addedCall;

      subscribeToRemoteParticipantInCall(addedCall);
    });
  });

  callAgent.on('callsUpdated', e => {
    e.removed.forEach(removedCall => {
      // dispose of video renders
      rendererLocal.dispose();
      rendererRemote.dispose();
      // toggle button states
      hangUpButton.disabled = true;
      callButton.disabled = false;
      stopVideoButton.disabled = true;
    })
  })

}
init();

callButton.addEventListener("click", async () => {
  const videoDevices = await deviceManager.getCameras();
  // const videoDeviceInfo = videoDevices[0];
  openSelectCameraDialog(videoDevices, async (videoDeviceInfo) => {

    localVideoStream = new LocalVideoStream(videoDeviceInfo);
    placeCallOptions = { videoOptions: { localVideoStreams: [localVideoStream] } };

    localVideoView();
    stopVideoButton.disabled = false;
    startVideoButton.disabled = true;

    const userToCall = calleeInput.value;
    call = callAgent.startCall(
      [{ communicationUserId: userToCall }],
      placeCallOptions
    );

    subscribeToRemoteParticipantInCall(call);

    hangUpButton.disabled = false;
    callButton.disabled = true;
  })
});

async function localVideoView() {
  rendererLocal = new VideoStreamRenderer(localVideoStream);
  const view = await rendererLocal.createView();
  document.getElementById("myVideo").appendChild(view.target);
}

function subscribeToRemoteParticipantInCall(callInstance) {
  callInstance.on('remoteParticipantsUpdated', e => {
    e.added.forEach(p => {
      subscribeToParticipantVideoStreams(p);
    })
  });
  callInstance.remoteParticipants.forEach(p => {
    subscribeToParticipantVideoStreams(p);
  })
}

function subscribeToParticipantVideoStreams(remoteParticipant) {
  remoteParticipant.on('videoStreamsUpdated', e => {
    e.added.forEach(v => {
      handleVideoStream(v);
    })
  });
  remoteParticipant.videoStreams.forEach(v => {
    handleVideoStream(v);
  });
}

function handleVideoStream(remoteVideoStream) {
  remoteVideoStream.on('isAvailableChanged', async () => {
    if (remoteVideoStream.isAvailable) {
      remoteVideoView(remoteVideoStream);
    } else {
      rendererRemote.dispose();
    }
  });
  if (remoteVideoStream.isAvailable) {
    remoteVideoView(remoteVideoStream);
  }
}

async function remoteVideoView(remoteVideoStream) {
  rendererRemote = new VideoStreamRenderer(remoteVideoStream);
  const view = await rendererRemote.createView();
  document.getElementById("remoteVideo").appendChild(view.target);
}

hangUpButton.addEventListener("click", async () => {
  // dispose of the renderers
  rendererLocal.dispose();
  rendererRemote.dispose();
  // end the current call
  await call.hangUp();
  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
  stopVideoButton.disabled = true;
});

stopVideoButton.addEventListener("click", async () => {
  await call.stopVideo(localVideoStream);
  rendererLocal.dispose();
  startVideoButton.disabled = false;
  stopVideoButton.disabled = true;
});

startVideoButton.addEventListener("click", async () => {
  await call.startVideo(localVideoStream);
  localVideoView();
  stopVideoButton.disabled = false;
  startVideoButton.disabled = true;
});