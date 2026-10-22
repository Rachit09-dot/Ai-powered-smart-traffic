"""
Synthetic Traffic Video Generator for AI Smart Traffic & Accident Detection System.
Generates a realistic 30-second 1280x720 30FPS MP4 traffic video with:
- Highway asphalt and dashed lane markers
- Multi-lane moving vehicles (cars, buses, trucks, motorcycles)
- A simulated incident event: car stalls and hazard lights flash at 10-15s to test anomaly/accident detection.
"""

import cv2
import numpy as np
from pathlib import Path

def generate_traffic_video(output_path: str = "backend/data/sample_traffic.mp4", duration_sec: int = 20, fps: int = 30):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    width, height = 1280, 720
    total_frames = duration_sec * fps

    # Try MP4V codec
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    if not out.isOpened():
        print(f"Error: Could not open VideoWriter for {output_path}")
        return False

    print(f"Generating {duration_sec}s ({total_frames} frames) synthetic traffic video -> {output_path}...")

    # Vehicle definitions: [x, y, vx, w, h, class_name, color]
    vehicles = [
        {"id": 1, "x": 100.0, "y": 360, "vx": 5.0, "w": 110, "h": 60, "cls": "car", "color": (50, 180, 240)},
        {"id": 2, "x": 400.0, "y": 460, "vx": 7.0, "w": 115, "h": 65, "cls": "car", "color": (220, 120, 40)},
        {"id": 3, "x": 50.0,  "y": 580, "vx": 4.0, "w": 200, "h": 85, "cls": "bus", "color": (60, 210, 100)},
        {"id": 4, "x": 750.0, "y": 360, "vx": 5.5, "w": 105, "h": 58, "cls": "car", "color": (230, 80, 80)},
        {"id": 5, "x": 300.0, "y": 460, "vx": 6.2, "w": 65,  "h": 38, "cls": "motorcycle", "color": (180, 60, 230)},
        {"id": 6, "x": 950.0, "y": 580, "vx": 3.8, "w": 220, "h": 95, "cls": "truck", "color": (130, 130, 130)}
    ]

    for frame_idx in range(total_frames):
        # Create road frame (Dark asphalt)
        frame = np.full((height, width, 3), (30, 34, 42), dtype=np.uint8)

        # Draw 3-lane Highway
        road_top = 280
        road_bottom = 710
        cv2.rectangle(frame, (0, road_top), (width, road_bottom), (50, 55, 62), -1)

        # Highway side barriers
        cv2.line(frame, (0, road_top), (width, road_top), (220, 220, 220), 4)
        cv2.line(frame, (0, road_bottom), (width, road_bottom), (220, 220, 220), 4)

        # Lane divider dashes
        lane_y1 = 420
        lane_y2 = 540
        dash_offset = (frame_idx * 10) % 70
        for x in range(-70 + dash_offset, width + 70, 70):
            cv2.line(frame, (x, lane_y1), (x + 35, lane_y1), (210, 210, 210), 2)
            cv2.line(frame, (x, lane_y2), (x + 35, lane_y2), (210, 210, 210), 2)

        # Top Information Banner
        cv2.rectangle(frame, (0, 0), (width, 90), (18, 22, 30), -1)
        cv2.putText(frame, "SMART HIGHWAY CCTV - CORRIDOR NORTH SECTOR 7", (30, 42),
                    cv2.FONT_HERSHEY_DUPLEX, 0.85, (56, 189, 248), 2)
        timestamp_str = f"FRAME: {frame_idx:05d} / {total_frames:05d} | TIME: {frame_idx/fps:.1f}s"
        cv2.putText(frame, timestamp_str, (30, 72),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (148, 163, 184), 1)

        # Simulated Incident: Car #4 stops on the roadway between frames 180 and 360 (seconds 6 to 12)
        is_incident_active = (180 <= frame_idx <= 380)

        # Update and render vehicles
        for v in vehicles:
            if v["id"] == 4 and is_incident_active:
                # Stalled car in flow
                pass
            else:
                v["x"] += v["vx"]
                if v["x"] > width + 150:
                    v["x"] = -250.0

            vx = int(v["x"])
            vy = int(v["y"])
            vw = v["w"]
            vh = v["h"]

            # Vehicle body
            cv2.rectangle(frame, (vx, vy), (vx + vw, vy + vh), v["color"], -1)
            # Cabin / Windshield
            cv2.rectangle(frame, (vx + int(vw * 0.6), vy + 6), (vx + int(vw * 0.88), vy + vh - 6), (200, 230, 255), -1)
            # Headlights
            cv2.circle(frame, (vx + vw, vy + 10), 5, (255, 255, 200), -1)
            cv2.circle(frame, (vx + vw, vy + vh - 10), 5, (255, 255, 200), -1)

            # If stalled, draw flashing hazard lights
            if v["id"] == 4 and is_incident_active and (frame_idx % 10 < 5):
                cv2.circle(frame, (vx + vw, vy + 10), 8, (0, 165, 255), -1)
                cv2.circle(frame, (vx + vw, vy + vh - 10), 8, (0, 165, 255), -1)

        out.write(frame)

    out.release()
    print(f"Synthetic video generated successfully: {output_path}")
    return True

if __name__ == "__main__":
    generate_traffic_video()
