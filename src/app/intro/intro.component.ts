import { Component, OnInit } from '@angular/core';

import { Engine } from '@babylonjs/core/Engines/engine';
import { Color3, Scene, ArcRotateCamera, CubeTexture, DirectionalLight, PBRMaterial, ShadowGenerator, Effect, ParticleSystem, Texture, AmmoJSPlugin, PhysicsImpostor, MeshBuilder, ActionManager, ExecuteCodeAction, PointerEventTypes, SceneLoader } from '@babylonjs/core';
import { Vector3, Space, Color4, Vector2 } from '@babylonjs/core/Maths/math';
// import { Camera } from '@babylonjs/core/Cameras/Camera';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';

@Component({
    selector: 'app-intro',
    templateUrl: './intro.component.html',
    styleUrls: ['./intro.component.scss', '../layout.scss']
})
export class IntroComponent implements OnInit {

    private canvas;
    private engine;
    private camera;

    public ngOnInit(): void {
        this.setup();
    }

    private async setup(): Promise<void> {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: false });
        const scene = new Scene(this.engine);
        scene.clearColor = new Color4(1, 1, 1);

        this.camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2.3, 200, new Vector3(-5, -2, -18), scene);
        // this.camera = new ArcRotateCamera('Camera', -Math.PI / 4, Math.PI / 2.5, 200, new Vector3(-3, 2, 0), scene);

        // Camera constraints
        this.camera.upperBetaLimit = Math.PI / 2;
        this.camera.lowerRadiusLimit = 16;
        this.camera.upperRadiusLimit = 40;
        // this.camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
        // this.camera.useAutoRotationBehavior = true;
        // this.camera.attachControl(canvas, true);
        // scene.debugLayer.show({ embedMode: true });

        // Environment Texture
        const hdrTexture = CubeTexture.CreateFromPrefilteredData('assets/environment.dds', scene);

        scene.imageProcessingConfiguration.exposure = 0.6;
        scene.imageProcessingConfiguration.contrast = 1.6;

        // Light
        const light = new DirectionalLight('DirectionalLight', new Vector3(0, -1, 0), scene);
        light.position.y = 10;

        // Material
        const plasticMat = new PBRMaterial('plastic', scene);
        plasticMat.reflectionTexture = hdrTexture;
        plasticMat.cameraColorCurvesEnabled = true;
        plasticMat.roughness = 0;
        plasticMat.metallic = 0;
        plasticMat.albedoColor = new Color3(0.9, 0.9, 0.9);
        plasticMat.reflectivityColor = new Color3(0.003, 0.003, 0.003);
        plasticMat.emissiveColor = new Color3(0.28627450980392155, 0.09411764705882353, 0.27450980392156865);
        plasticMat.ambientColor = new Color3(0.5764705882352941, 0.27450980392156865, 0.5529411764705883);
        plasticMat.backFaceCulling = false;

        // PARTICLES
        const fountain = Mesh.CreateBox('fountain', 0.01, scene);
        Effect.ShadersStore.myParticleFragmentShader =
            '#ifdef GL_ES\n' +
            'precision highp float;\n' +
            '#endif\n' +

            'varying vec2 vUV;\n' +                     // Provided by babylon.js
            'varying vec4 vColor;\n' +                  // Provided by babylon.js

            'uniform sampler2D diffuseSampler;\n' +     // Provided by babylon.js
            'uniform float time;\n' +                   // This one is custom so we need to declare it to the effect

            'void main(void) {\n' +
            'vec2 position = vUV;\n' +

            'float color = 0.0;\n' +
            'vec2 center = vec2(0.5, 0.5);\n' +

            'color = sin(distance(position, center) * 10.0+ time * vColor.g);\n' +

            'vec4 baseColor = texture2D(diffuseSampler, vUV);\n' +

            'gl_FragColor = baseColor * vColor * vec4( vec3(color, color, color), 1.0 );\n' +
            '}\n' +
            '';

        const effect = this.engine.createEffectForParticles('myParticle', ['time']);
        const emitRate = 5000;
        const particleSystem = new ParticleSystem('particles', emitRate, scene, effect);
        fountain.position.y = 0;
        fountain.position.x = 0;
        fountain.position.z = 0;
        particleSystem.particleTexture = new Texture('assets/flare.png', scene);
        particleSystem.emitRate = emitRate;
        particleSystem.emitter = fountain;
        particleSystem.minEmitBox = new Vector3(700, -700, 700); // Starting all From
        particleSystem.maxEmitBox = new Vector3(-700, 700, -700); // To...
        particleSystem.minSize = 1;
        particleSystem.maxSize = 5;
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;

        particleSystem.textureMask = new Color4(1, 1, 1, 1);

        particleSystem.color1 = new Color4(0, 0, 0, 0);
        particleSystem.color2 = new Color4(0, 0, 0, 0);
        particleSystem.colorDead = new Color4(1, 1, 1, 1);

        particleSystem.maxLifeTime = 10;

        particleSystem.gravity = new Vector3(0, 0, -2);
        particleSystem.direction1 = new Vector3(-1, -1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);

        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 1;

        particleSystem.updateSpeed = 0.0004;

        // particleSystem.translationPivot = new Vector3(0, 100, 30);
        particleSystem.translationPivot = new Vector2(100, 30);
        particleSystem.preWarmCycles = 500;
        particleSystem.preWarmStepOffset = 5;

        particleSystem.start(); // Start the particle system

        // Physics
        scene.enablePhysics(new Vector3(0, -10, 0), new AmmoJSPlugin());

        const groundCollider = Mesh.CreateGround('groundCollider', 80, 80, 2, scene);
        groundCollider.checkCollisions = true;
        groundCollider.isVisible = false;
        groundCollider.physicsImpostor = new PhysicsImpostor(groundCollider, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 1 }, scene);

        // create a box used to trigger the destrucion of marbles
        const killBox = MeshBuilder.CreateBox('killBox', { width: 1000, depth: 1000, height: 0.5 }, scene);
        killBox.position = new Vector3(0, -80, 0);
        killBox.isVisible = false;

        // Shadows
        const shadowGenerator = new ShadowGenerator(512, light);
        shadowGenerator.usePoissonSampling = true;
        shadowGenerator.filter = 3;
        shadowGenerator.blurBoxOffset = 3;
        shadowGenerator.blurScale = 8;
        shadowGenerator.normalBias = 0.3;

        // Load meshes
        await SceneLoader.ImportMeshAsync('', '', 'assets/freecode_objects2.glb', scene);

        // Freecode Logo
        const freeCodeLogo = scene.getMeshByName('freeCodeLogo');
        freeCodeLogo.setParent(null);
        freeCodeLogo.material = plasticMat;
        freeCodeLogo.scaling = new Vector3(0.3, 0.3, 0.3);
        freeCodeLogo.position = new Vector3(4, 2.5, 0);
        freeCodeLogo.physicsImpostor = new PhysicsImpostor(freeCodeLogo, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1.5 }, scene);
        shadowGenerator.addShadowCaster(freeCodeLogo);

        // Freecode text
        let textF = scene.getMeshByName('f');
        textF = generateTextSettings(textF, 0);

        let textR = scene.getMeshByName('r');
        textR = generateTextSettings(textR, -2);

        let textE1 = scene.getMeshByName('e1');
        textE1 = generateTextSettings(textE1, -4);

        let textE2 = scene.getMeshByName('e2');
        textE2 = generateTextSettings(textE2, -7);

        let textC = scene.getMeshByName('c');
        textC = generateTextSettings(textC, -9);

        let textO = scene.getMeshByName('o');
        textO = generateTextSettings(textO, -11);

        let textD = scene.getMeshByName('d');
        textD = generateTextSettings(textD, -13.6);

        let textE3 = scene.getMeshByName('e3');
        textE3 = generateTextSettings(textE3, -16);

        function generateTextSettings(textObject, posOffset) {
            textObject.setParent(null);
            textObject.material = plasticMat;
            textObject.scaling = new Vector3(4, 4, 4);
            const randomHeight = Math.floor(Math.random() * (20 - 10)) + 10;
            textObject.position = new Vector3(posOffset, randomHeight, 0);
            textObject.physicsImpostor = new PhysicsImpostor(textObject, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.2, restitution: 1.5 }, scene);
            shadowGenerator.addShadowCaster(textObject);

            textObject.actionManager = new ActionManager(scene); // add an actionManager to the textObject

            // Reset the object if it intersects with the killbox
            textObject.actionManager.registerAction(
                new ExecuteCodeAction({ trigger: ActionManager.OnIntersectionEnterTrigger, parameter: killBox },
                    () => {
                        const randomPos = Math.floor(Math.random() * (0 - -15)) + -15;
                        textObject.position = new Vector3(randomPos, 15, 3);
                        textObject.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
                        textObject.physicsImpostor.setAngularVelocity(new Vector3(0, 0, 0));
                    })
            );

            return textObject;
        }

        // Bakgrundsfärgen
        const helper = scene.createDefaultEnvironment({
            skyboxSize: 500,
            // enableGroundShadow: true,
            groundYBias: -50,
            groundShadowLevel: 0.2,
            enableGroundMirror: true,
            enableGroundShadow: true,
            // primaryColorShadowLevel: 1,
            groundSize: 80,
            sizeAuto: false
        });

        helper.setMainColor(new Color3(0.47, 0.11, 0.68));
        // helper.setMainColor(new Color3(0.2, 0.065, 0.257));
        // helper.setMainColor(new Color3(0.38823529411764707, 0.09019607843137255, 0.5686274509803921));

        // scene.getMaterialByID('BackgroundSkyboxMaterial').primaryColorShadowLevel = 1;
        const skybox = scene.getMaterialByID('BackgroundSkyboxMaterial') as any;
        skybox.primaryColorShadowLevel = 1;

        // POINTER EVENTS
        scene.onPointerObservable.add((pointerInfo) => {

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const mesh = scene.getMeshByName(pointerInfo.pickInfo.pickedMesh.name);

                if (mesh && mesh.physicsImpostor && mesh.physicsImpostor.applyImpulse) {
                    const direction = pointerInfo.pickInfo.ray.direction;
                    const forceDirection = new Vector3(direction.x, direction.y, direction.z);
                    // console.log('forceDirection', forceDirection);
                    // const impulseMagnitude = 2;
                    const forceMagnitude = 200;
                    // const contactLocalRefPoint = Vector3.Zero();
                    const localRefPoint = new Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
                    // mesh.physicsImpostor.applyImpulse(forceDirection.scale(impulseMagnitude), mesh.getAbsolutePosition().add(contactLocalRefPoint));
                    // mesh.physicsImpostor.applyImpulse(forceDirection.scale(impulseMagnitude), mesh.getAbsolutePosition().add(localRefPoint));
                    mesh.physicsImpostor.applyForce(forceDirection.scale(forceMagnitude), mesh.getAbsolutePosition().add(localRefPoint));
                }
            }
        });

        this.updateCameraFocus();

        scene.registerBeforeRender(() => {
            freeCodeLogo.rotate(new Vector3(0, 90, 0), Math.PI / 600, Space.WORLD);
        });

        this.engine.runRenderLoop(() => {
            if (scene) {
                scene.render();
            }
        });

        // Resize
        window.addEventListener('resize', () => {
            this.updateCameraFocus();
            this.engine.resize();
        });
    }

    private updateCameraFocus() {
        if (this.camera) {
            if (window.innerWidth <= 640) {
                this.camera.target.z = -5;
                this.camera.target.y = 2;
            }
            else {
                this.camera.target.z = -18;
                this.camera.target.y = -2;
            }
        }
    }
}
