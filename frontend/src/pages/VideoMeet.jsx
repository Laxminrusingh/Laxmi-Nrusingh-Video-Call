import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import PersonIcon from '@mui/icons-material/Person';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    // Fix: define connect function
    function connect() {
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room') || window.location.pathname.split('/').pop();
        setMeetingId(roomId);
        setParticipantId(Math.random().toString(36).substr(2, 9));
        setAskForUsername(false);
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    // Fix: define sendMessage function
    function sendMessage() {
        if (socketRef.current && message.trim()) {
            socketRef.current.emit('chat-message', message, username);
            setMessage("");
        }
    }

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState([]);
    let [audio, setAudio] = useState();
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(false);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(3);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");
    let [meetingId, setMeetingId] = useState("");
    let [participantId, setParticipantId] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    useEffect(() => {
        console.log("HELLO")
        getPermissions();

    })

    // Screen sharing function
    let getDislayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ 
                video: { mediaSource: 'screen' }, 
                audio: true 
            })
                .then(stream => {
                    setScreen(true);
                    // Stop previous tracks
                    try {
                        if (window.localStream) {
                            window.localStream.getTracks().forEach(track => track.stop());
                        }
                    } catch (e) { }
                    window.localStream = stream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = stream;
                    }
                    // Update all peer connections with screen share
                    for (let id in connections) {
                        if (id === socketIdRef.current) continue;
                        
                        // Replace video track with screen share
                        const videoSender = connections[id].getSenders().find(sender => 
                            sender.track && sender.track.kind === 'video'
                        );
                        if (videoSender) {
                            videoSender.replaceTrack(stream.getVideoTracks()[0]);
                        } else {
                            connections[id].addStream(stream);
                        }
                    }
                    // When screen share ends, revert to camera
                    stream.getTracks().forEach(track => {
                        track.onended = () => {
                            setScreen(false);
                            getUserMedia();
                        };
                    });
                })
                .catch((e) => {
                    console.log('Screen share error:', e);
                    setScreen(false);
                });
        }
    }

    const getPermissions = async () => {
        try {
            // Check for available devices first
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideo = devices.some(device => device.kind === 'videoinput');
            const hasAudio = devices.some(device => device.kind === 'audioinput');

            // Test video permission
            if (hasVideo) {
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setVideoAvailable(true);
                    videoStream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    setVideoAvailable(false);
                }
            } else {
                setVideoAvailable(false);
            }

            // Test audio permission
            if (hasAudio) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setAudioAvailable(true);
                    audioStream.getTracks().forEach(track => track.stop());
                } catch (e) {
                    setAudioAvailable(false);
                }
            } else {
                setAudioAvailable(false);
            }

            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

        } catch (error) {
            console.log('Device enumeration failed:', error);
            setVideoAvailable(false);
            setAudioAvailable(false);
            setScreenAvailable(false);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);

        }


    }, [video, audio])
    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();

    }




    let getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop())
            }
        } catch (e) { console.log(e) }

        window.localStream = stream
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            // Replace tracks instead of adding new stream
            const videoSender = connections[id].getSenders().find(sender => 
                sender.track && sender.track.kind === 'video'
            );
            const audioSender = connections[id].getSenders().find(sender => 
                sender.track && sender.track.kind === 'audio'
            );

            if (videoSender && stream.getVideoTracks()[0]) {
                videoSender.replaceTrack(stream.getVideoTracks()[0]);
            } else if (stream.getVideoTracks()[0]) {
                connections[id].addTrack(stream.getVideoTracks()[0], stream);
            }

            if (audioSender && stream.getAudioTracks()[0]) {
                audioSender.replaceTrack(stream.getAudioTracks()[0]);
            } else if (stream.getAudioTracks()[0]) {
                connections[id].addTrack(stream.getAudioTracks()[0], stream);
            }
        }
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            const constraints = {
                video: video && videoAvailable,
                audio: audio && audioAvailable
            };
            navigator.mediaDevices.getUserMedia(constraints)
                .then(getUserMediaSuccess)
                .catch((e) => {
                    console.log('getUserMedia error:', e);
                    // Fallback: try with different constraints
                    if (constraints.video && constraints.audio) {
                        // Try audio only
                        navigator.mediaDevices.getUserMedia({ audio: true })
                            .then(getUserMediaSuccess)
                            .catch(err => console.log('Audio fallback failed:', err));
                    }
                })
        } else {
            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks()
                    tracks.forEach(track => track.stop())
                }
            } catch (e) { }
        }
    }





    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            getUserMedia()

        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }




    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
                addSystemMessage(`A participant left the meeting`);
            })

            socketRef.current.on('user-joined', (id, clients) => {
                if (id !== socketIdRef.current) {
                    addSystemMessage(`New participant joined the meeting`);
                }
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE:", videoRef.current);
                        console.log("FINDING ID: ", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            // Create a new video
                            console.log("CREATING NEW");
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };


                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
    }
    let handleAudio = () => {
        setAudio(!audio);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => {
                track.enabled = !audio;
            });
        }
    }



    let handleScreen = () => {
        if (screen) {
            // Stop screen sharing
            setScreen(false);
            getUserMedia();
        } else {
            // Start screen sharing
            getDislayMedia();
        }
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    // Chat toggle
    let toggleChat = () => {
        setModal((prev) => !prev);
        setNewMessages(0);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data, timestamp: new Date().toLocaleTimeString() }
        ]);
        if (!showModal) {
            setNewMessages(prev => prev + 1);
        }
    };

    // Add system message when user joins
    const addSystemMessage = (message) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "System", data: message, timestamp: new Date().toLocaleTimeString(), isSystem: true }
        ]);
    };

    return (
        <div>
            {askForUsername === true ? (
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <h2>Join Video Call</h2>
                        <div className={styles.meetingInfo}>
                            <p>Meeting ID: {window.location.pathname.split('/').pop() || 'room-' + Math.random().toString(36).substr(2, 6)}</p>
                        </div>
                        <TextField 
                            id="outlined-basic" 
                            label="Enter Your Name" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outlined"
                            fullWidth
                            style={{ marginBottom: '20px' }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={connect}
                            style={{ 
                                background: '#1976d2',
                                padding: '12px 30px',
                                fontSize: '16px',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        >
                            Join Meeting
                        </Button>
                        <div className={styles.previewVideo}>
                            <video ref={localVideoref} autoPlay muted></video>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>


                    {/* Chat modal */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h1>Chat</h1>
                                    <button className={styles.closeButton} onClick={toggleChat}>❌</button>
                                </div>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div 
                                            className={styles.messageItem} 
                                            key={index}
                                            data-system={item.isSystem || false}
                                        >
                                            <div className={styles.messageSender}>{item.sender}</div>
                                            <div className={styles.messageText}>{item.data}</div>
                                            <div className={styles.messageStatus}>
                                                {item.timestamp} • ✓ Seen by all
                                            </div>
                                        </div>
                                    )) : <p>No Messages Yet</p>}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField 
                                        value={message} 
                                        onChange={(e) => setMessage(e.target.value)} 
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        label="Type a message..." 
                                        variant="outlined" 
                                        size="small"
                                        fullWidth
                                    />
                                    <Button variant='contained' onClick={sendMessage} className={styles.sendButton}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Controls bottom center */}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable === true ? (
                            <IconButton onClick={handleScreen} style={{ color: screen ? "#FF9839" : "white" }}>
                                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        ) : null}
                        <Badge badgeContent={newMessages} max={999} color='error'>
                            <IconButton onClick={toggleChat} style={{ color: showModal ? '#4a90e2' : 'white', background: showModal ? 'white' : 'rgba(60,60,60,0.7)' }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    {/* Meeting Info Bar */}
                    <div className={styles.meetingInfoBar}>
                        <div className={styles.meetingDetails}>
                            <span>Meeting ID: {meetingId}</span>
                            <span>Participants: {videos.length + 1}</span>
                        </div>
                    </div>

                    {/* Invite Link Section */}
                    <div className={styles.inviteSection}>
                        <button 
                            className={styles.inviteButton}
                            onClick={() => {
                                const inviteLink = window.location.href;
                                navigator.clipboard.writeText(inviteLink);
                                alert('Meeting link copied to clipboard! Share this link with others to join.');
                            }}
                        >
                            📋 Copy Invite Link
                        </button>
                    </div>

                    {/* Video grid */}
                    <div className={styles.conferenceView}>
                        {/* Always show your own video/camera/screen share */}
                        <div className={styles.participant} key={socketIdRef.current}>
                            {(video === true || screen === true) ? (
                                <video
                                    ref={localVideoref}
                                    autoPlay
                                    muted
                                    style={{
                                        width: '100%',
                                        maxWidth: '340px',
                                        height: '220px',
                                        objectFit: 'cover',
                                        borderRadius: '18px',
                                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                                        background: '#222',
                                        border: '3px solid #3949ab'
                                    }}
                                />
                            ) : (
                                <div style={{ width: '100%', maxWidth: '340px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', border: '3px solid #3949ab' }}>
                                    <PersonIcon style={{ fontSize: 80, color: '#888' }} />
                                </div>
                            )}
                            <div className={styles.participantName}>
                                {username || "You"} {screen && "(Screen)"}
                                <div className={styles.participantId}>ID: {participantId}</div>
                            </div>
                        </div>
                        {/* Show other participants' video/screen share */}
                        {videos.map((videoObj, idx) => (
                            <div className={styles.participant} key={videoObj.socketId}>
                                {videoObj.stream ? (
                                    <video
                                        data-socket={videoObj.socketId}
                                        ref={ref => {
                                            if (ref && videoObj.stream) {
                                                ref.srcObject = videoObj.stream;
                                            }
                                        }}
                                        autoPlay
                                        style={{
                                            width: '100%',
                                            maxWidth: '340px',
                                            height: '220px',
                                            objectFit: 'cover',
                                            borderRadius: '18px',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                                            background: '#222',
                                            border: '3px solid #3949ab'
                                        }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', maxWidth: '340px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', border: '3px solid #3949ab' }}>
                                        <PersonIcon style={{ fontSize: 80, color: '#888' }} />
                                    </div>
                                )}
                                <div className={styles.participantName}>
                                    User {idx + 1}
                                    <div className={styles.participantId}>ID: {videoObj.socketId.substr(-6)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
