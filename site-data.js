window.REPORT_DEMOS = [
  {
    "id": "driving",
    "label": "Driving simulation",
    "title": "Explore a different future.",
    "description": "Long rollouts and edited trajectories in a seven-camera driving scene.",
    "control": "Initial observations, ego trajectory and scene context.",
    "watch": "Track road geometry and surrounding traffic as the ego path changes.",
    "clips": [
      {
        "src": "media/m26.mp4",
        "poster": "posters/m26.jpg",
        "title": "45-second rollout",
        "caption": "Seven-view generation on a logged trajectory over approximately 45 seconds.",
        "width": 2786,
        "height": 1452
      },
      {
        "src": "media/m27.mp4",
        "poster": "posters/m27.jpg",
        "title": "Trajectory edit A",
        "caption": "Generation conditioned on an edited ego trajectory.",
        "width": 2786,
        "height": 1452
      },
      {
        "src": "media/m28.mp4",
        "poster": "posters/m28.jpg",
        "title": "Trajectory edit B",
        "caption": "A second ego trajectory that departs from the recorded drive.",
        "width": 2786,
        "height": 1452
      },
      {
        "src": "media/m29.mp4",
        "poster": "posters/m29.jpg",
        "title": "Trajectory edit C",
        "caption": "An additional edited trajectory with out-of-distribution ego motion.",
        "width": 2786,
        "height": 1452
      },
      {
        "src": "media/m24.mp4",
        "poster": "posters/m24.jpg",
        "title": "Night crossing",
        "caption": "A crossing vehicle observed across the seven-camera rig.",
        "width": 2786,
        "height": 1452
      }
    ]
  },
  {
    "id": "physical",
    "label": "Physical interactions",
    "title": "Follow the event across views.",
    "description": "Long-tail road participants, weather and physical interactions.",
    "control": "Scene conditioning and synchronized multi-view observations.",
    "watch": "Compare event progression and scene consistency across the eight examples.",
    "clips": [
      {
        "src": "media/physical-interactions-grid.mp4",
        "poster": "posters/physical-interactions-grid.jpg",
        "title": "Eight physical scenes",
        "caption": "Eight synchronized seven-view rollouts in a 2×4 grid: rockfall, animal, night snow, standing water, heavy rain, lead vehicle, gravel road and pedestrian interaction.",
        "width": 3924,
        "height": 2242,
        "posterFit": "contain"
      }
    ]
  },
  {
    "id": "camera",
    "label": "Camera control",
    "title": "Change the viewpoint.",
    "description": "Camera-pose conditioning for driving and embodied observations.",
    "control": "Prescribed camera trajectories and task-specific world controls.",
    "watch": "Compare the requested camera motion with the generated observations.",
    "clips": [
      {
        "src": "media/camera-single-row.mp4",
        "poster": "posters/camera-single-row.jpg",
        "title": "Single-view camera",
        "caption": "Ground truth, prescribed camera trajectory and prediction, for two examples.",
        "width": 2576,
        "height": 320
      },
      {
        "src": "media/camera-viewpoint-row.mp4",
        "poster": "posters/camera-viewpoint-row.jpg",
        "title": "Driving camera paths",
        "caption": "Prescribed camera trajectory and generated frames for two driving sequences, side by side.",
        "width": 3864,
        "height": 1108
      },
      {
        "src": "media/camera-head-row.mp4",
        "poster": "posters/camera-head-row.jpg",
        "title": "Head & wrist cameras",
        "caption": "Camera and robot controls alongside generated embodied views, for two examples.",
        "width": 2576,
        "height": 256
      }
    ]
  },
  {
    "id": "embodied",
    "label": "Embodied intelligence",
    "title": "Connect actions to observations.",
    "description": "Multi-view robot generation conditioned on actions and observations.",
    "control": "Robot actions, initial observations and task conditions.",
    "watch": "Follow arm motion and object interaction across head and wrist cameras.",
    "clips": [
      {
        "src": "media/embodied-row-1.mp4",
        "poster": "posters/embodied-row-1.jpg",
        "title": "Tabletop interaction",
        "caption": "Action-conditioned generation from a head camera and two wrist cameras, for two episodes.",
        "width": 2576,
        "height": 342
      },
      {
        "src": "media/embodied-row-2.mp4",
        "poster": "posters/embodied-row-2.jpg",
        "title": "Rendered control and object interaction",
        "caption": "Rendered robot control alongside the generated views (left) and multi-view generation during a tabletop manipulation task (right).",
        "width": 2576,
        "height": 342
      }
    ]
  },
  {
    "id": "wam",
    "label": "World action model",
    "title": "Link the world to action.",
    "description": "World-action demonstrations on robot tasks.",
    "control": "Robot observations and task context.",
    "watch": "Compare observations with the model's predictions.",
    "layout": "row",
    "clips": [
      {
        "src": "media/m40.mp4",
        "poster": "posters/m40.jpg",
        "title": "WAM: tabletop",
        "caption": "Robot world-action demonstration with observations and model predictions.",
        "width": 512,
        "height": 256
      },
      {
        "src": "media/m42.mp4",
        "poster": "posters/m42.jpg",
        "title": "WAM: drawer",
        "caption": "A second robot world-action task with observations and predictions.",
        "width": 512,
        "height": 256
      }
    ]
  },
  {
    "id": "policy",
    "label": "Policy learning",
    "title": "Close loop training",
    "description": "Recorded policy comparisons in an interactive driving simulator.",
    "control": "Policy trajectories fed back into the world-model simulator.",
    "watch": "Compare yielding, braking and conflict resolution in each scenario.",
    "clips": [
      {
        "src": "media/policy-loop-1.mp4",
        "poster": "posters/policy-loop-1.jpg",
        "title": "Stop-sign intersection",
        "caption": "Closed-loop simulation: baseline policy (top) and our policy (bottom) in the same scene.",
        "width": 1280,
        "height": 490
      },
      {
        "src": "media/policy-loop-2.mp4",
        "poster": "posters/policy-loop-2.jpg",
        "title": "Multi-lane road",
        "caption": "Closed-loop simulation: baseline policy (top) and our policy (bottom) in the same scene.",
        "width": 2880,
        "height": 1100
      },
      {
        "src": "media/policy-loop-3.mp4",
        "poster": "posters/policy-loop-3.jpg",
        "title": "Hotel drop-off area",
        "caption": "Closed-loop simulation: baseline policy (top) and our policy (bottom) in the same scene.",
        "width": 2880,
        "height": 1100
      }
    ]
  },
  {
    "id": "perception",
    "label": "Video & perception",
    "title": "Learn appearance and geometry.",
    "description": "Video generation, depth prediction and referring segmentation.",
    "control": "Text prompts for generation; task inputs for depth and segmentation.",
    "watch": "Inspect scene structure and the target object across the examples over time.",
    "clips": [
      {
        "src": "media/perception-row.mp4",
        "poster": "posters/perception-row.jpg",
        "title": "Four generations",
        "caption": "Four text-to-video generations side by side: two corner cases, then two physical-reasoning scenes.",
        "width": 3376,
        "height": 480
      },
      {
        "src": "media/perception-depth-row.mp4",
        "poster": "posters/perception-depth-row.jpg",
        "title": "Depth prediction",
        "caption": "RGB observations alongside predicted depth, for two examples.",
        "width": 2576,
        "height": 370
      },
      {
        "src": "media/perception-refseg-row.mp4",
        "poster": "posters/perception-refseg-row.jpg",
        "title": "Referring segmentation",
        "caption": "RGB frames and referring segmentation masks for the target object, for two examples.",
        "width": 3856,
        "height": 374
      }
    ]
  },
  {
    "id": "reconstruction",
    "label": "3D reconstruction",
    "title": "Keep a memory of the scene.",
    "description": "WorldRec 2.0 reconstructs geometry and appearance for novel-view rendering.",
    "control": "Multi-camera, multi-temporal observations and a target camera pose.",
    "watch": "Inspect the reconstructed scene from the displayed camera viewpoints.",
    "clips": [
      {
        "src": "media/m43.mp4",
        "poster": "posters/m43.jpg",
        "title": "Residential scene",
        "caption": "Novel-view reconstruction across cameras in a residential scene.",
        "width": 1280,
        "height": 480
      },
      {
        "src": "media/m45.mp4",
        "poster": "posters/m45.jpg",
        "title": "Multi-camera scene",
        "caption": "Reconstructed camera views from a shared 3D scene.",
        "width": 1280,
        "height": 480
      }
    ]
  }
];
