#!/usr/bin/env bash
# Genera los videos de prueba (no se guardan en el repositorio). Necesita ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/fixtures"
q="-loglevel error -y"
# 60 s, 13 s (clip «de relleno») y 4 min, en WebM
ffmpeg $q -f lavfi -i testsrc=size=320x240:rate=10 -t 60 -c:v libvpx -b:v 60k -deadline realtime clip.webm
ffmpeg $q -f lavfi -i testsrc=size=320x240:rate=10 -t 13 -c:v libvpx -b:v 60k -deadline realtime lion.webm
ffmpeg $q -f lavfi -i testsrc=size=160x90:rate=10 -t 240 -c:v libvpx -b:v 50k -deadline realtime long.webm
# HLS de 90 s (index.m3u8 + index0.ts…)
rm -rf hls && mkdir hls
ffmpeg $q -f lavfi -i testsrc=size=320x240:rate=10 -f lavfi -i sine=f=440 -t 90 -c:v libx264 -preset ultrafast -c:a aac \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_segment_filename 'hls/index%d.ts' hls/index.m3u8
# DASH de 60 s
rm -rf dash && mkdir dash
ffmpeg $q -i clip.webm -map 0:v -c:v libx264 -preset ultrafast -profile:v baseline -g 48 -an -f dash -seg_duration 4 \
  -use_template 1 -use_timeline 0 -init_seg_name 'init-$RepresentationID$.mp4' -media_seg_name 'seg-$RepresentationID$-$Number$.m4s' dash/manifest.mpd
# HLS de 70 s con 2 calidades y 2 audios (Latino / Castellano)
rm -rf mhls && mkdir mhls
ffmpeg $q -f lavfi -i testsrc=size=320x180:rate=10 -f lavfi -i sine=f=440 -f lavfi -i sine=f=880 -t 70 \
  -map 0:v -map 0:v -map 1:a -map 2:a -c:v libx264 -preset ultrafast -c:a aac -s:v:0 320x180 -s:v:1 160x90 -b:v:0 300k -b:v:1 100k \
  -f hls -hls_time 4 -hls_playlist_type vod -master_pl_name ffmpeg-master.m3u8 \
  -var_stream_map "v:0,agroup:aud v:1,agroup:aud a:0,agroup:aud,name:Latino a:1,agroup:aud,name:Castellano" mhls/stream_%v.m3u8
cat > mhls/master.m3u8 <<'M3U'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="Latino",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="es-419",URI="stream_Latino.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="Castellano",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="es-ES",URI="stream_Castellano.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=405900,RESOLUTION=320x180,CODECS="avc1.f4000b,mp4a.40.2",AUDIO="aud"
stream_0.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=185900,RESOLUTION=160x90,CODECS="avc1.f4000a,mp4a.40.2",AUDIO="aud"
stream_1.m3u8
M3U
echo "videos de prueba listos en $(pwd)"
