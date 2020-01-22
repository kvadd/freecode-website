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
    private scene;
    private camera;

    public ngOnInit(): void {
        this.setup();
    }

    private async setup(): Promise<void> {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: false });
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(1, 1, 1);

        this.camera = this.setupCamera();

        // Environment Texture
        const hdrTexture = CubeTexture.CreateFromPrefilteredData('assets/environment.dds', this.scene);
        this.scene.imageProcessingConfiguration.exposure = 0.6;
        this.scene.imageProcessingConfiguration.contrast = 1.6;

        // Light
        const light = this.setupLight();

        // Material
        const plasticMat = this.setupPlasticMaterial(hdrTexture);

        // PARTICLES
        this.setupShaders();
        this.setupParticleSystem();

        // Physics
        this.scene.enablePhysics(new Vector3(0, -10, 0), new AmmoJSPlugin());

        const groundCollider = Mesh.CreateGround('groundCollider', 80, 80, 2, this.scene);
        groundCollider.checkCollisions = true;
        groundCollider.isVisible = false;
        groundCollider.physicsImpostor = new PhysicsImpostor(groundCollider, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 1 }, this.scene);

        // create a box used to trigger the destrucion of marbles
        const killBox = MeshBuilder.CreateBox('killBox', { width: 1000, depth: 1000, height: 0.5 }, this.scene);
        killBox.position = new Vector3(0, -80, 0);
        killBox.isVisible = false;

        // Shadows
        const shadowGenerator = this.setupShadowGenerator(light);

        // Load meshes
        await SceneLoader.ImportMeshAsync('', '', 'assets/freecode_objects2.glb', this.scene);

        // Freecode Logo
        const freeCodeLogo = this.scene.getMeshByName('freeCodeLogo');
        freeCodeLogo.setParent(null);
        freeCodeLogo.material = plasticMat;
        freeCodeLogo.scaling = new Vector3(0.3, 0.3, 0.3);
        freeCodeLogo.position = new Vector3(4, 2.5, 0);
        freeCodeLogo.physicsImpostor = new PhysicsImpostor(freeCodeLogo, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 1.5 }, this.scene);
        shadowGenerator.addShadowCaster(freeCodeLogo);

        this.setupTextMeshes(shadowGenerator, plasticMat, killBox);

        // Bakgrundsfärgen
        const environment = this.scene.createDefaultEnvironment({
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

        environment.setMainColor(new Color3(0.47, 0.11, 0.68));
        // environment.setMainColor(new Color3(0.2, 0.065, 0.257));
        // environment.setMainColor(new Color3(0.38823529411764707, 0.09019607843137255, 0.5686274509803921));

        // this.scene.getMaterialByID('BackgroundSkyboxMaterial').primaryColorShadowLevel = 1;
        const skybox = this.scene.getMaterialByID('BackgroundSkyboxMaterial') as any;
        skybox.primaryColorShadowLevel = 1;

        // POINTER EVENTS
        this.setupPointerEvents();

        this.updateCameraFocus();

        this.scene.registerBeforeRender(() => {
            freeCodeLogo.rotate(new Vector3(0, 90, 0), Math.PI / 600, Space.WORLD);
        });

        this.engine.runRenderLoop(() => {
            if (this.scene) {
                this.scene.render();
            }
        });

        // Resize
        window.addEventListener('resize', () => {
            this.updateCameraFocus();
            this.engine.resize();
        });
    }

    private setupCamera(): ArcRotateCamera {
        const camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2.3, 200, new Vector3(-5, -2, -18), this.scene);
        // this.camera = new ArcRotateCamera('Camera', -Math.PI / 4, Math.PI / 2.5, 200, new Vector3(-3, 2, 0), scene);

        // Camera constraints
        camera.upperBetaLimit = Math.PI / 2;
        camera.lowerRadiusLimit = 16;
        camera.upperRadiusLimit = 40;
        // this.camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
        // this.camera.useAutoRotationBehavior = true;
        // this.camera.attachControl(canvas, true);
        // scene.debugLayer.show({ embedMode: true });

        return camera;
    }

    private setupLight(): DirectionalLight {
        const light = new DirectionalLight('DirectionalLight', new Vector3(0, -1, 0), this.scene);
        light.position.y = 10;

        return light;
    }

    private setupPlasticMaterial(hdrTexture: CubeTexture): PBRMaterial {
        const plasticMat = new PBRMaterial('plastic', this.scene);

        plasticMat.reflectionTexture = hdrTexture;
        plasticMat.cameraColorCurvesEnabled = true;
        plasticMat.roughness = 0;
        plasticMat.metallic = 0;
        plasticMat.albedoColor = new Color3(0.9, 0.9, 0.9);
        plasticMat.reflectivityColor = new Color3(0.003, 0.003, 0.003);
        plasticMat.emissiveColor = new Color3(0.28627450980392155, 0.09411764705882353, 0.27450980392156865);
        plasticMat.ambientColor = new Color3(0.5764705882352941, 0.27450980392156865, 0.5529411764705883);
        plasticMat.backFaceCulling = false;

        return plasticMat;
    }

    private setupShadowGenerator(light): ShadowGenerator {
        const shadowGenerator = new ShadowGenerator(512, light);

        shadowGenerator.usePoissonSampling = true;
        shadowGenerator.filter = 3;
        shadowGenerator.blurBoxOffset = 3;
        shadowGenerator.blurScale = 8;
        shadowGenerator.normalBias = 0.3;

        return shadowGenerator;
    }

    private setupShaders() {
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
            ''
        ;
    }

    private setupParticleSystem(): ParticleSystem {
        const fountain = Mesh.CreateBox('fountain', 0.01, this.scene);
        const effect = this.engine.createEffectForParticles('myParticle', ['time']);
        const emitRate = 5000;
        const particleSystem = new ParticleSystem('particles', emitRate, this.scene, effect);
        fountain.position.y = 0;
        fountain.position.x = 0;
        fountain.position.z = 0;
        particleSystem.particleTexture = new Texture('assets/flare.png', this.scene);
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

        return particleSystem;
    }

    private setupTextMeshes(shadowGenerator, plasticMat, killBox) {
        // Freecode text
        let textF = this.scene.getMeshByName('f');
        textF = this.generateTextSettings(textF, 0, shadowGenerator, plasticMat, killBox);

        let textR = this.scene.getMeshByName('r');
        textR = this.generateTextSettings(textR, -2, shadowGenerator, plasticMat, killBox);

        let textE1 = this.scene.getMeshByName('e1');
        textE1 = this.generateTextSettings(textE1, -4, shadowGenerator, plasticMat, killBox);

        let textE2 = this.scene.getMeshByName('e2');
        textE2 = this.generateTextSettings(textE2, -7, shadowGenerator, plasticMat, killBox);

        let textC = this.scene.getMeshByName('c');
        textC = this.generateTextSettings(textC, -9, shadowGenerator, plasticMat, killBox);

        let textO = this.scene.getMeshByName('o');
        textO = this.generateTextSettings(textO, -11, shadowGenerator, plasticMat, killBox);

        let textD = this.scene.getMeshByName('d');
        textD = this.generateTextSettings(textD, -13.6, shadowGenerator, plasticMat, killBox);

        let textE3 = this.scene.getMeshByName('e3');
        textE3 = this.generateTextSettings(textE3, -16, shadowGenerator, plasticMat, killBox);
    }

    private generateTextSettings(textObject, posOffset, shadowGenerator, material, killBox) {
        textObject.setParent(null);
        textObject.material = material;
        textObject.scaling = new Vector3(4, 4, 4);
        const randomHeight = Math.floor(Math.random() * (20 - 10)) + 10;
        textObject.position = new Vector3(posOffset, randomHeight, 0);
        textObject.physicsImpostor = new PhysicsImpostor(textObject, PhysicsImpostor.BoxImpostor, { mass: 1, friction: 0.2, restitution: 1.5 }, this.scene);
        shadowGenerator.addShadowCaster(textObject);

        textObject.actionManager = new ActionManager(this.scene); // add an actionManager to the textObject

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

    private setupPointerEvents(): void {
        this.scene.onPointerObservable.add((pointerInfo) => {

            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                const mesh = this.scene.getMeshByName(pointerInfo.pickInfo.pickedMesh.name);

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
    }

    private updateCameraFocus(): void {
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
