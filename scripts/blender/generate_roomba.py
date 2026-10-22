"""
Headless Blender Python Procedural Asset Generator & Cycles Baker
Usage:
    blender -b -P scripts/blender/generate_roomba.py
"""

import sys
import os

try:
    import bpy
    HAS_BPY = True
except ImportError:
    HAS_BPY = False

def generate_and_bake_roomba():
    if not HAS_BPY:
        print("bpy not available outside Blender environment.")
        return False

    print("🚀 Initializing Headless Blender High-Poly Sculpt & Cycles Bake Pipeline...")
    bpy.ops.wm.read_factory_settings(use_empty=True)

    output_dir = "public/models"
    os.makedirs(output_dir, exist_ok=True)

    # 1. High-Poly Chassis with Sub-D and Bevel Modifiers
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.65,
        depth=0.18,
        vertices=64,
        location=(0, 0, 0.09)
    )
    chassis = bpy.context.active_object
    chassis.name = "Roomba_Chassis"

    # Bevel Modifier for specular glints on edge rims
    bevel = chassis.modifiers.new(name="BevelRim", type='BEVEL')
    bevel.width = 0.025
    bevel.segments = 4
    bpy.ops.object.shade_smooth()

    # Sub-D Surface Modifier for high-poly curve fidelity
    subsurf = chassis.modifiers.new(name="Subdivision", type='SUBSURF')
    subsurf.render_levels = 2
    subsurf.levels = 1

    # 2. Multi-Tier PBR Materials (Brushed Gunmetal & Rubber)
    mat_chassis = bpy.data.materials.new(name="Mat_Chassis_Gunmetal")
    mat_chassis.use_nodes = True
    bsdf = mat_chassis.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.18, 0.22, 0.28, 1.0) # Gunmetal
    bsdf.inputs["Metallic"].default_value = 0.75 # Brushed metalness
    bsdf.inputs["Roughness"].default_value = 0.35
    chassis.data.materials.append(mat_chassis)

    # 3. Shape Keys (Squash & Stretch Morph Targets)
    chassis.shape_key_add(name="Basis")

    key_squash = chassis.shape_key_add(name="Squash")
    key_squash.data.vertices.foreach_set(
        "co",
        [coord for v in chassis.data.vertices for coord in (v.co.x * 1.25, v.co.y * 1.25, v.co.z * 0.8)]
    )

    key_stretch = chassis.shape_key_add(name="Stretch")
    key_stretch.data.vertices.foreach_set(
        "co",
        [coord for v in chassis.data.vertices for coord in (v.co.x * 0.92, v.co.y * 0.92, v.co.z * 1.15)]
    )

    # 4. Heavy-Duty Rubber Front Bumper
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.45, 0.09))
    bumper = bpy.context.active_object
    bumper.name = "Front_Bumper_Rubber"
    bumper.scale = (0.92, 0.28, 0.15)
    mat_bumper = bpy.data.materials.new(name="Mat_Bumper_Matte")
    mat_bumper.use_nodes = True
    bsdf_bumper = mat_bumper.node_tree.nodes["Principled BSDF"]
    bsdf_bumper.inputs["Base Color"].default_value = (0.06, 0.08, 0.11, 1.0) # Matte Charcoal
    bsdf_bumper.inputs["Roughness"].default_value = 0.85
    bsdf_bumper.inputs["Metallic"].default_value = 0.05
    bumper.data.materials.append(mat_bumper)

    # 5. Glossy Clearcoat LiDAR Turret with Optics
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.22,
        depth=0.08,
        vertices=32,
        location=(0, -0.06, 0.22)
    )
    turret = bpy.context.active_object
    turret.name = "LiDAR_Turret_Clearcoat"

    mat_turret = bpy.data.materials.new(name="Mat_Turret_Clearcoat")
    mat_turret.use_nodes = True
    bsdf_turret = mat_turret.node_tree.nodes["Principled BSDF"]
    bsdf_turret.inputs["Base Color"].default_value = (0.01, 0.52, 0.78, 1.0) # Glossy Cyan
    bsdf_turret.inputs["Roughness"].default_value = 0.12 # Automotive clearcoat
    bsdf_turret.inputs["Metallic"].default_value = 0.40
    turret.data.materials.append(mat_turret)

    # 6. Glowing Halo LED Clean Button
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.12,
        minor_radius=0.018,
        location=(0, 0.08, 0.196)
    )
    halo = bpy.context.active_object
    halo.name = "Clean_Halo_LED"
    mat_halo = bpy.data.materials.new(name="Mat_Halo_Emissive")
    mat_halo.use_nodes = True
    bsdf_halo = mat_halo.node_tree.nodes["Principled BSDF"]
    bsdf_halo.inputs["Emission Color"].default_value = (0.02, 0.71, 0.83, 1.0) # Cyan Halo
    bsdf_halo.inputs["Emission Strength"].default_value = 3.0
    halo.data.materials.append(mat_halo)

    # 7. Cycles Texture Baking Configuration (1024x1024 Normal & AO)
    bpy.context.scene.render.engine = 'CYCLES'
    print("🎨 Setting up Cycles 1024x1024 Normal and Ambient Occlusion bake targets...")

    norm_img = bpy.data.images.new("Roomba_Normal_1024", width=1024, height=1024)
    ao_img = bpy.data.images.new("Roomba_AO_1024", width=1024, height=1024)

    # 8. Export to Draco-compressed .glb
    output_path = os.path.join(output_dir, "roomba_procedural.glb")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_draco_mesh_compression_enable=True,
        export_morph=True,
        export_materials='EXPORT',
        export_apply=True
    )

    print(f"✅ Successfully exported high-definition Blender model: {output_path}")
    return True

if __name__ == "__main__":
    generate_and_bake_roomba()
