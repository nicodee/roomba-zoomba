import sys
import os

try:
    import bpy
    HAS_BPY = True
except ImportError:
    HAS_BPY = False

def generate_roomba():
    if not HAS_BPY:
        print("bpy not available outside Blender environment.")
        return False

    print("🚀 Initializing Headless Blender Procedural Asset Generator...")
    bpy.ops.wm.read_factory_settings(use_empty=True)

    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.65,
        depth=0.18,
        vertices=32,
        location=(0, 0, 0.09)
    )
    chassis = bpy.context.active_object
    chassis.name = "Roomba_Chassis"

    bevel = chassis.modifiers.new(name="Bevel", type='BEVEL')
    bevel.width = 0.02
    bevel.segments = 3
    bpy.ops.object.shade_smooth()

    mat_chassis = bpy.data.materials.new(name="Mat_Chassis")
    mat_chassis.use_nodes = True
    bsdf = mat_chassis.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.12, 0.16, 0.24, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.45
    bsdf.inputs["Metallic"].default_value = 0.15
    chassis.data.materials.append(mat_chassis)

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

    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.22,
        depth=0.08,
        vertices=24,
        location=(0, -0.05, 0.22)
    )
    turret = bpy.context.active_object
    turret.name = "Sensor_Turret"

    mat_turret = bpy.data.materials.new(name="Mat_Turret")
    mat_turret.use_nodes = True
    bsdf_turret = mat_turret.node_tree.nodes["Principled BSDF"]
    bsdf_turret.inputs["Base Color"].default_value = (0.01, 0.52, 0.78, 1.0)
    bsdf_turret.inputs["Roughness"].default_value = 0.15
    turret.data.materials.append(mat_turret)

    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.04,
        location=(0, -0.05, 0.28)
    )
    led = bpy.context.active_object
    led.name = "Status_LED"

    mat_led = bpy.data.materials.new(name="Mat_LED")
    mat_led.use_nodes = True
    bsdf_led = mat_led.node_tree.nodes["Principled BSDF"]
    bsdf_led.inputs["Emission Color"].default_value = (0.06, 0.72, 0.51, 1.0)
    bsdf_led.inputs["Emission Strength"].default_value = 3.0
    led.data.materials.append(mat_led)

    output_dir = "public/models"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "roomba_procedural.glb")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_draco_mesh_compression_enable=True,
        export_morph=True,
        export_materials='EXPORT',
        export_apply=True
    )

    return True

if __name__ == "__main__":
    generate_roomba()
