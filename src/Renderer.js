import {Image} from "pure-react-carousel";
import React, {useMemo , useState, useRef} from "react";
// import Canvas from 'react-three-fiber'
import { Canvas, useFrame, useThree, extend} from 'react-three-fiber'
import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { BasisTextureLoader } from 'three/examples/jsm/loaders/BasisTextureLoader'
import { OrbitControls } from "./OrbitControls";

extend({ OrbitControls });

const CameraControls = (props) => {
    // Get a reference to the Three.js Camera, and the canvas html element.
    // We need these to setup the OrbitControls component.
    // https://threejs.org/docs/#examples/en/controls/OrbitControls
    const {
        camera,
        gl: { domElement },
    } = useThree();
    // Ref to the controls, so that we can update them on every frame using useFrame
    const controls = useRef();
    useFrame((state) => controls.current.update());
    return <orbitControls  ref={controls} args={[camera, domElement, props.onClick]} />;
};
// https://stackoverflow.com/questions/39850083/three-js-objloader-texture
function Model({ meshurl, textureurl }) {
    const [obj, setobj] = useState();
    useMemo(() =>  {
        new THREE.TextureLoader().load(textureurl, texture => {
            let objLoader = new OBJLoader();
            // var material = new THREE.MeshBasicMaterial( { map: texture } );
            objLoader.load(meshurl, object => {
                object.traverse(function (child) {   // aka setTexture
                    if (child instanceof THREE.Mesh) {
                        child.material.map = texture;
                    }
                });
                setobj(object);
            })

        })
    }, [meshurl, textureurl]);
    return obj ? <primitive object={obj}/> : null;
}

// function Model({ meshurl, textureurl }) {
//     const [obj, setobj] = useState();
//     useMemo(() =>  {new OBJLoader().load(meshurl, setobj)}, [meshurl, textureurl]);
//     // if (obj){
//     //     console.log("Successfully loaded");
//     // }else{
//     //     console.log("error loading");
//     // }
//     return obj ? <primitive object={obj}/> : null;
// }
function ObjectRenderer(props) {
    const item = props.item;
    // console.log("LOADING ITEM");
    // console.log(item);
    if (item.face !== undefined) {
        // console.log("Rendering card");
        const card = item;
        // console.log("Loading image file: " + encodeURI(card.face));

        return <Image
            src={
                `/card?url=${encodeURI(card.face)}&offset=${card.offset}&width=${card.width}&height=${card.height}`
            }
            hasMasterSpinner={true}
        />;
    } else if(item.mesh !== undefined){
        // console.log("Rendering 3D");
        // return <div >3D render</div>;
        return <Canvas  camera={{ position: [0, 0, 5], far: 50 }} style={props.style}>
            <CameraControls onClick={props.onClick} />
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Model
                meshurl={`../../mesh?url=${encodeURI(item.mesh)}`}
                textureurl={`../../diffuse?url=${encodeURI(item.diffuse)}`}
            />
        </Canvas>;
    }

}

export default ObjectRenderer;
