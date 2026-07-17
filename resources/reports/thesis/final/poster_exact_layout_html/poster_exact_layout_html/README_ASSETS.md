```json
{
  "canvas": {
    "type": "poster",
    "format": "A0 portrait",
    "aspect_ratio": "1000:1414",
    "reference_render_size_px": {
      "width": 1055,
      "height": 1491
    },
    "background": "#FFFFFF",
    "outer_margin_px": 8,
    "outer_border": {
      "color": "#003B8F",
      "width_px": 2,
      "radius_px": 10
    },
    "overall_style": {
      "theme": "academic engineering infographic poster",
      "primary_color": "#003B8F",
      "secondary_color": "#0054B8",
      "accent_color": "#F26A21",
      "text_color": "#111111",
      "muted_line_color": "#B9CAE9",
      "card_background": "#FFFFFF",
      "font_family": "bold condensed sans-serif for headings, clean sans-serif for body",
      "visual_language": "blue framed cards, white background, technical icons, device photos, system diagrams"
    }
  },
  "global_layout": {
    "grid": {
      "columns": 12,
      "gutter_px": 10,
      "content_x_px": 18,
      "content_y_px": 16,
      "content_width_px": 1019,
      "content_height_px": 1456
    },
    "section_spacing_px": 8,
    "card_radius_px": 7,
    "section_border": {
      "color": "#0B4CA3",
      "width_px": 1.4,
      "radius_px": 7
    },
    "section_header_style": {
      "background": "#003B8F",
      "text_color": "#FFFFFF",
      "font_weight": 700,
      "border_radius_px": 5,
      "height_px": 28,
      "padding_x_px": 10
    }
  },
  "header": {
    "bounds_px": {
      "x": 18,
      "y": 18,
      "width": 1019,
      "height": 104
    },
    "background": "#FFFFFF",
    "elements": {
      "logo_area": {
        "bounds_px": {
          "x": 24,
          "y": 28,
          "width": 200,
          "height": 70
        },
        "content": {
          "wordmark_top": "PHENIKAA",
          "wordmark_bottom": "UNIVERSITY",
          "symbol": "orange-blue circular swoosh mark"
        },
        "typography": {
          "wordmark_top": {
            "font_size_px": 31,
            "font_weight": 800,
            "color": "#003B8F",
            "letter_spacing_px": 1
          },
          "wordmark_bottom": {
            "font_size_px": 16,
            "font_weight": 500,
            "color": "#003B8F",
            "letter_spacing_px": 6
          }
        }
      },
      "title": {
        "bounds_px": {
          "x": 245,
          "y": 18,
          "width": 500,
          "height": 88
        },
        "text": "THIẾT KẾ HỆ THỐNG IoT CHO ỨNG DỤNG\nQUẢN LÝ PHƯƠNG TIỆN GIAO THÔNG\nTRONG LĨNH VỰC CHO THUÊ XE TỰ LÁI",
        "typography": {
          "font_size_px": 30,
          "line_height_px": 35,
          "font_weight": 800,
          "text_align": "center",
          "color": "#003B8F",
          "letter_spacing_px": 0.2
        },
        "note": "Không có dòng subtitle màu cam dưới tiêu đề."
      },
      "student_info_card": {
        "bounds_px": {
          "x": 752,
          "y": 18,
          "width": 276,
          "height": 96
        },
        "background": "#003B8F",
        "border_radius_px": 8,
        "padding_px": {
          "top": 14,
          "right": 16,
          "bottom": 14,
          "left": 18
        },
        "text_color": "#FFFFFF",
        "rows": [
          {
            "icon": "person",
            "label": "Sinh viên:",
            "value": "Lê Trọng An"
          },
          {
            "icon": "id-card",
            "label": "MSSV:",
            "value": "21010389"
          },
          {
            "icon": "book/class",
            "label": "Lớp:",
            "value": "K15-KTCDT2"
          },
          {
            "icon": "advisor/person",
            "label": "GVHD:",
            "value": "TS. Nguyễn Đức Nam"
          }
        ],
        "typography": {
          "font_size_px": 12,
          "line_height_px": 22,
          "font_weight": 700,
          "label_width_px": 72,
          "value_align": "left"
        }
      }
    }
  },
  "sections": [
    {
      "id": 1,
      "title": "1. Giới thiệu",
      "bounds_px": {
        "x": 18,
        "y": 126,
        "width": 1019,
        "height": 188
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 131,
          "width": 115,
          "height": 26
        },
        "background": "#003B8F",
        "text": "1. Giới thiệu",
        "text_color": "#FFFFFF",
        "font_size_px": 17,
        "font_weight": 700
      },
      "content": {
        "intro_text_card": {
          "bounds_px": {
            "x": 25,
            "y": 163,
            "width": 225,
            "height": 134
          },
          "text": "Dịch vụ cho thuê xe tự lái cần theo dõi\nphương tiện sau khi bàn giao cho khách\nthuê. Bài toán không chỉ là biết vị trí xe,\nmà còn cần theo dõi trạng thái vận hành,\ncảnh báo sự kiện và dữ liệu điều khiển\nsau chuyến đi để tối ưu vận hành và\nbảo vệ tài sản.",
          "typography": {
            "font_size_px": 11,
            "line_height_px": 18,
            "color": "#111111",
            "text_align": "left"
          },
          "right_divider": {
            "x_px": 253,
            "color": "#B9CAE9",
            "width_px": 1
          }
        },
        "flow": {
          "bounds_px": {
            "x": 278,
            "y": 138,
            "width": 720,
            "height": 160
          },
          "direction": "left-to-right",
          "arrow_style": {
            "color": "#003B8F",
            "width_px": 4,
            "type": "solid arrow"
          },
          "steps": [
            {
              "number": 1,
              "number_circle": {
                "center_px": {
                  "x": 358,
                  "y": 148
                },
                "diameter_px": 24,
                "background": "#003B8F",
                "text_color": "#FFFFFF"
              },
              "visual": {
                "type": "car image",
                "bounds_px": {
                  "x": 300,
                  "y": 181,
                  "width": 105,
                  "height": 55
                }
              },
              "caption": {
                "text": "Xe cho thuê",
                "bounds_px": {
                  "x": 310,
                  "y": 250,
                  "width": 90,
                  "height": 24
                },
                "font_size_px": 14,
                "text_align": "center"
              }
            },
            {
              "number": 2,
              "number_circle": {
                "center_px": {
                  "x": 518,
                  "y": 148
                },
                "diameter_px": 24,
                "background": "#003B8F",
                "text_color": "#FFFFFF"
              },
              "visual": {
                "type": "black IoT device image",
                "bounds_px": {
                  "x": 464,
                  "y": 175,
                  "width": 112,
                  "height": 70
                }
              },
              "caption": {
                "text": "Thiết bị IoT\ntrên xe",
                "bounds_px": {
                  "x": 475,
                  "y": 252,
                  "width": 94,
                  "height": 42
                },
                "font_size_px": 14,
                "text_align": "center"
              }
            },
            {
              "number": 3,
              "number_circle": {
                "center_px": {
                  "x": 674,
                  "y": 148
                },
                "diameter_px": 24,
                "background": "#003B8F",
                "text_color": "#FFFFFF"
              },
              "visual": {
                "type": "4G/LTE tower icon",
                "bounds_px": {
                  "x": 633,
                  "y": 164,
                  "width": 78,
                  "height": 92
                },
                "stroke_color": "#003B8F"
              },
              "caption": {
                "text": "4G/LTE\n+ MQTT",
                "bounds_px": {
                  "x": 637,
                  "y": 253,
                  "width": 78,
                  "height": 40
                },
                "font_size_px": 14,
                "text_align": "center"
              }
            },
            {
              "number": 4,
              "number_circle": {
                "center_px": {
                  "x": 826,
                  "y": 148
                },
                "diameter_px": 24,
                "background": "#003B8F",
                "text_color": "#FFFFFF"
              },
              "visual": {
                "type": "cloud server stack icon",
                "bounds_px": {
                  "x": 785,
                  "y": 166,
                  "width": 82,
                  "height": 82
                },
                "stroke_color": "#003B8F",
                "fill": "#FFFFFF"
              },
              "caption": {
                "text": "Máy chủ\nxử lý",
                "bounds_px": {
                  "x": 787,
                  "y": 253,
                  "width": 78,
                  "height": 40
                },
                "font_size_px": 14,
                "text_align": "center"
              }
            },
            {
              "number": 5,
              "number_circle": {
                "center_px": {
                  "x": 974,
                  "y": 148
                },
                "diameter_px": 24,
                "background": "#003B8F",
                "text_color": "#FFFFFF"
              },
              "visual": {
                "type": "dashboard monitor image",
                "bounds_px": {
                  "x": 928,
                  "y": 175,
                  "width": 95,
                  "height": 70
                }
              },
              "caption": {
                "text": "Dashboard\nquản lý",
                "bounds_px": {
                  "x": 925,
                  "y": 253,
                  "width": 100,
                  "height": 40
                },
                "font_size_px": 14,
                "text_align": "center"
              }
            }
          ]
        }
      }
    },
    {
      "id": 2,
      "title": "2. Mục tiêu",
      "bounds_px": {
        "x": 18,
        "y": 319,
        "width": 1019,
        "height": 136
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 324,
          "width": 105,
          "height": 26
        },
        "background": "#003B8F",
        "text": "2. Mục tiêu",
        "font_size_px": 17,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "items": [
        {
          "bounds_px": {
            "x": 42,
            "y": 354,
            "width": 150,
            "height": 88
          },
          "icon": {
            "type": "microchip",
            "color": "#003B8F",
            "size_px": 45
          },
          "text": "Thiết kế và chế tạo\nthiết bị IoT\ngắn trên xe.",
          "typography": {
            "font_size_px": 12,
            "line_height_px": 17,
            "text_align": "center"
          }
        },
        {
          "bounds_px": {
            "x": 235,
            "y": 354,
            "width": 150,
            "height": 88
          },
          "icon": {
            "type": "location pin",
            "color": "#003B8F",
            "size_px": 48
          },
          "text": "Thu dữ liệu vị trí,\ntrạng thái thiết bị và\ndữ liệu OBD-II cơ bản.",
          "typography": {
            "font_size_px": 12,
            "line_height_px": 17,
            "text_align": "center"
          }
        },
        {
          "bounds_px": {
            "x": 431,
            "y": 354,
            "width": 150,
            "height": 88
          },
          "icon": {
            "type": "cell tower",
            "color": "#003B8F",
            "size_px": 50
          },
          "text": "Truyền dữ liệu qua\n4G/LTE bằng\nMQTT.",
          "typography": {
            "font_size_px": 12,
            "line_height_px": 17,
            "text_align": "center"
          }
        },
        {
          "bounds_px": {
            "x": 625,
            "y": 354,
            "width": 160,
            "height": 88
          },
          "icon": {
            "type": "cloud upload",
            "color": "#003B8F",
            "size_px": 53
          },
          "text": "Xây dựng máy chủ tiếp nhận,\nlưu trữ, xử lý và\nphát cảnh báo.",
          "typography": {
            "font_size_px": 12,
            "line_height_px": 17,
            "text_align": "center"
          }
        },
        {
          "bounds_px": {
            "x": 834,
            "y": 354,
            "width": 170,
            "height": 88
          },
          "icon": {
            "type": "analytics monitor",
            "color": "#003B8F",
            "size_px": 50
          },
          "text": "Xây dựng dashboard để theo dõi\nbản đồ, trạng thái xe, lịch sử\nvà cảnh báo.",
          "typography": {
            "font_size_px": 12,
            "line_height_px": 17,
            "text_align": "center"
          }
        }
      ],
      "vertical_dividers": {
        "style": "dotted",
        "color": "#0B4CA3",
        "width_px": 1,
        "x_positions_px": [
          202,
          397,
          590,
          795
        ]
      }
    },
    {
      "id": 3,
      "title": "3. Kiến trúc hệ thống từ thiết bị đến dashboard",
      "bounds_px": {
        "x": 18,
        "y": 460,
        "width": 1019,
        "height": 376
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 465,
          "width": 365,
          "height": 26
        },
        "background": "#003B8F",
        "text": "3. Kiến trúc hệ thống từ thiết bị đến dashboard",
        "font_size_px": 16,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "columns": [
        {
          "id": "3.1",
          "title": "Thiết bị trên xe",
          "bounds_px": {
            "x": 26,
            "y": 500,
            "width": 160,
            "height": 320
          },
          "header": {
            "number_circle": "1",
            "title": "Thiết bị trên xe",
            "font_size_px": 12,
            "color": "#003B8F"
          },
          "image": {
            "type": "hardware photo",
            "bounds_px": {
              "x": 44,
              "y": 528,
              "width": 92,
              "height": 82
            },
            "fit": "contain",
            "note": "Ảnh thiết bị nằm trong khung gần vuông, có ăng-ten đen kéo sang phải."
          },
          "bullets": [
            "ESP32-S3",
            "SIM7600CE-T\n(4G/LTE + GNSS)",
            "OBD-II BLE (M8tac Car Pro)",
            "LIS3SDH (cảm biến gia tốc)",
            "MicroSD (lưu đệm dữ liệu)",
            "Pin 18650",
            "Nguồn 12-24 VDC"
          ],
          "typography": {
            "font_size_px": 10.5,
            "line_height_px": 18,
            "text_align": "left"
          }
        },
        {
          "id": "3.2",
          "title": "Firmware thiết bị",
          "bounds_px": {
            "x": 191,
            "y": 500,
            "width": 175,
            "height": 320
          },
          "header": {
            "number_circle": "2",
            "title": "Firmware thiết bị",
            "font_size_px": 12,
            "color": "#003B8F"
          },
          "bullets": [
            "Đọc GNSS / OBD-II / IMU",
            "Chế độ chạy – đỗ – cảnh báo",
            "Ngủ sâu, tiết kiệm năng lượng",
            "Lưu đệm dữ liệu vào SD",
            "Gửi khi kết nối trở lại",
            "Cập nhật firmware từ xa (OTA)"
          ],
          "typography": {
            "font_size_px": 10.5,
            "line_height_px": 21,
            "text_align": "left"
          },
          "logos": [
            {
              "name": "FreeRTOS",
              "bounds_px": {
                "x": 220,
                "y": 700,
                "width": 105,
                "height": 36
              },
              "dominant_color": "#2FA43A"
            },
            {
              "name": "ESP-IDF",
              "bounds_px": {
                "x": 218,
                "y": 752,
                "width": 112,
                "height": 36
              },
              "dominant_color": "#E83323"
            }
          ]
        },
        {
          "id": "3.3",
          "title": "Truyền dữ liệu",
          "bounds_px": {
            "x": 371,
            "y": 500,
            "width": 122,
            "height": 320
          },
          "header": {
            "number_circle": "3",
            "title": "Truyền dữ liệu",
            "font_size_px": 12,
            "color": "#003B8F"
          },
          "icon": {
            "type": "cell tower",
            "bounds_px": {
              "x": 408,
              "y": 530,
              "width": 52,
              "height": 72
            },
            "color": "#003B8F"
          },
          "bullets": [
            "MQTT 3.1.1\nqua 4G/LTE\nTLS",
            "rawdata / telemetry",
            "status / heartbeat",
            "events / alerts",
            "firmware / OTA",
            "commands"
          ],
          "typography": {
            "font_size_px": 10.5,
            "line_height_px": 19,
            "text_align": "left"
          }
        },
        {
          "id": "3.4",
          "title": "Máy chủ xử lý",
          "bounds_px": {
            "x": 500,
            "y": 500,
            "width": 340,
            "height": 320
          },
          "header": {
            "number_circle": "4",
            "title": "Máy chủ xử lý",
            "font_size_px": 12,
            "color": "#003B8F"
          },
          "diagram": {
            "bounds_px": {
              "x": 515,
              "y": 525,
              "width": 310,
              "height": 275
            },
            "box_style": {
              "background": "#FFFFFF",
              "border_color": "#0B4CA3",
              "border_width_px": 1.2,
              "radius_px": 5,
              "text_color": "#003B8F",
              "font_size_px": 9.5
            },
            "nodes": [
              {
                "id": "tracker",
                "text": "Thiết bị\n(tracker)",
                "bounds_px": {
                  "x": 526,
                  "y": 528,
                  "width": 68,
                  "height": 42
                }
              },
              {
                "id": "emqx",
                "text": "EMQX\n(Broker)",
                "bounds_px": {
                  "x": 628,
                  "y": 528,
                  "width": 72,
                  "height": 42
                }
              },
              {
                "id": "mqtt_bridge",
                "text": "MQTT Bridge\n(kiểm tra & phân luồng)",
                "bounds_px": {
                  "x": 720,
                  "y": 528,
                  "width": 94,
                  "height": 42
                }
              },
              {
                "id": "postgresql",
                "text": "PostgreSQL\n(thiết bị,\nphương tiện,\ndữ liệu)",
                "bounds_px": {
                  "x": 526,
                  "y": 598,
                  "width": 82,
                  "height": 80
                },
                "icon": "PostgreSQL elephant"
              },
              {
                "id": "victoriametrics",
                "text": "VictoriaMetrics\n(lưu trữ số liệu\nvận hành)",
                "bounds_px": {
                  "x": 625,
                  "y": 598,
                  "width": 82,
                  "height": 80
                },
                "icon": "orange stack"
              },
              {
                "id": "victorialogs",
                "text": "VictoriaLogs\n(lưu trữ &\nnhật ký)",
                "bounds_px": {
                  "x": 724,
                  "y": 598,
                  "width": 82,
                  "height": 80
                },
                "icon": "purple stack"
              },
              {
                "id": "backend",
                "text": "Backend API\n(Express.js + Socket.IO)",
                "bounds_px": {
                  "x": 548,
                  "y": 704,
                  "width": 128,
                  "height": 57
                },
                "logos": [
                  "Express",
                  "JS",
                  "Socket.IO"
                ]
              },
              {
                "id": "frontend",
                "text": "Frontend Web\n(Next.js + React)",
                "bounds_px": {
                  "x": 700,
                  "y": 704,
                  "width": 105,
                  "height": 57
                },
                "logos": [
                  "NEXT.js",
                  "React"
                ]
              },
              {
                "id": "nginx",
                "text": "Nginx + TLS\n(Reverse Proxy / HTTPS Ingress)",
                "bounds_px": {
                  "x": 548,
                  "y": 765,
                  "width": 128,
                  "height": 45
                },
                "logo": "NGINX",
                "border_color": "#54A66B",
                "text_color": "#148C40"
              },
              {
                "id": "client",
                "text": "Client / Người dùng\n(HTTPS Web)",
                "bounds_px": {
                  "x": 698,
                  "y": 765,
                  "width": 108,
                  "height": 45
                },
                "icon": "user silhouette"
              }
            ],
            "connectors": {
              "style": "blue arrows",
              "color": "#0B4CA3",
              "width_px": 1.2
            }
          }
        },
        {
          "id": "3.5",
          "title": "Dashboard quản lý",
          "bounds_px": {
            "x": 848,
            "y": 500,
            "width": 175,
            "height": 320
          },
          "header": {
            "number_circle": "5",
            "title": "Dashboard quản lý",
            "font_size_px": 12,
            "color": "#003B8F"
          },
          "image": {
            "type": "dashboard monitor",
            "bounds_px": {
              "x": 880,
              "y": 540,
              "width": 112,
              "height": 82
            }
          },
          "bullets": [
            "Bản đồ, vị trí theo thời gian",
            "Trạng thái thiết bị và xe",
            "Lịch sử hành trình, sự kiện",
            "Cảnh báo & sự kiện",
            "Theo dõi, truy vết, báo cáo"
          ],
          "typography": {
            "font_size_px": 10.5,
            "line_height_px": 23,
            "text_align": "left"
          }
        }
      ]
    },
    {
      "id": 4,
      "title": "4. Thiết kế và chế tạo thiết bị",
      "bounds_px": {
        "x": 18,
        "y": 842,
        "width": 1019,
        "height": 190
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 847,
          "width": 248,
          "height": 26
        },
        "background": "#003B8F",
        "text": "4. Thiết kế và chế tạo thiết bị",
        "font_size_px": 16,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "cards": [
        {
          "title": "Bo mạch và các khối chức năng",
          "bounds_px": {
            "x": 35,
            "y": 880,
            "width": 300,
            "height": 135
          },
          "title_style": {
            "font_size_px": 11,
            "font_weight": 700,
            "color": "#003B8F",
            "text_align": "center"
          },
          "image": {
            "type": "annotated PCB",
            "bounds_px": {
              "x": 105,
              "y": 902,
              "width": 150,
              "height": 108
            },
            "annotation_color": "#FF0000",
            "labels": [
              "THẺ NHỚ",
              "VỊ TRÍ NÚT/IMU",
              "MODEM 4G",
              "MOT/POWER & MCU",
              "CỤM CÁC KHỐI NGUỒN"
            ]
          }
        },
        {
          "title": "Bo mạch sau lắp ráp",
          "bounds_px": {
            "x": 370,
            "y": 880,
            "width": 290,
            "height": 135
          },
          "title_style": {
            "font_size_px": 11,
            "font_weight": 700,
            "color": "#003B8F",
            "text_align": "center"
          },
          "image": {
            "type": "assembled board photo",
            "bounds_px": {
              "x": 403,
              "y": 900,
              "width": 215,
              "height": 105
            },
            "fit": "contain",
            "note": "Ảnh đang nằm ngang, gồm dây, bo mạch và pin xanh."
          }
        },
        {
          "title": "Thiết bị sau khi đóng vỏ",
          "bounds_px": {
            "x": 690,
            "y": 880,
            "width": 315,
            "height": 135
          },
          "title_style": {
            "font_size_px": 11,
            "font_weight": 700,
            "color": "#003B8F",
            "text_align": "center"
          },
          "image": {
            "type": "final device photo",
            "bounds_px": {
              "x": 706,
              "y": 900,
              "width": 255,
              "height": 105
            },
            "fit": "contain",
            "content": "silver enclosure with antennas on wooden background"
          }
        }
      ],
      "vertical_dividers": {
        "color": "#B9CAE9",
        "width_px": 1,
        "x_positions_px": [
          350,
          675
        ]
      }
    },
    {
      "id": 5,
      "title": "5. Triển khai phần mềm và máy chủ",
      "bounds_px": {
        "x": 18,
        "y": 1036,
        "width": 1019,
        "height": 170
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 1041,
          "width": 300,
          "height": 26
        },
        "background": "#003B8F",
        "text": "5. Triển khai phần mềm và máy chủ",
        "font_size_px": 16,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "subsections": [
        {
          "title": "1. Pipeline CI/CD",
          "bounds_px": {
            "x": 35,
            "y": 1072,
            "width": 270,
            "height": 118
          },
          "flow": [
            {
              "icon": "GitHub Actions",
              "label": "GitHub Actions"
            },
            {
              "arrow": true
            },
            {
              "icon": "Docker whale",
              "label": "Docker Image"
            },
            {
              "arrow": true
            },
            {
              "icon": "VPS server",
              "label": "VPS / Production\n(Docker)"
            }
          ],
          "typography": {
            "font_size_px": 9.5,
            "text_align": "center"
          }
        },
        {
          "title": "2. Dịch vụ trong VPS / Docker",
          "bounds_px": {
            "x": 315,
            "y": 1072,
            "width": 285,
            "height": 118
          },
          "service_tiles": [
            "EMQX\nBroker\nMQTT Bridge",
            "Express\nBackend API",
            "NEXT.js\nFrontend",
            "PostgreSQL",
            "VictoriaMetrics",
            "VictoriaLogs",
            "Redis",
            "Grafana",
            "Sentry\n(Giám sát & cảnh báo)"
          ],
          "tile_style": {
            "border_color": "#B9CAE9",
            "radius_px": 6,
            "background": "#FFFFFF",
            "font_size_px": 8.5
          }
        },
        {
          "title": "3. Truy cập an toàn (Reverse Proxy)",
          "bounds_px": {
            "x": 610,
            "y": 1072,
            "width": 190,
            "height": 118
          },
          "content": {
            "main_box": "Nginx + TLS\n(Reverse Proxy)",
            "main_logo": "NGINX",
            "flows": [
              "HTTPS (Web)",
              "HTTPS (API)"
            ]
          },
          "colors": {
            "nginx_green": "#148C40",
            "arrow_color": "#000000"
          }
        },
        {
          "title": "4. Công nghệ giao diện",
          "bounds_px": {
            "x": 807,
            "y": 1072,
            "width": 210,
            "height": 118
          },
          "logos": [
            "NEXT.js",
            "React",
            "Leaflet",
            "ECharts"
          ],
          "text": "Bản đồ, biểu đồ, chi tiết thiết bị,\ncảnh báo và báo cáo.",
          "typography": {
            "font_size_px": 9.5,
            "text_align": "center"
          }
        }
      ]
    },
    {
      "id": 6,
      "title": "6. Kết quả triển khai và kiểm thử",
      "bounds_px": {
        "x": 18,
        "y": 1212,
        "width": 1019,
        "height": 93
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 1217,
          "width": 278,
          "height": 26
        },
        "background": "#003B8F",
        "text": "6. Kết quả triển khai và kiểm thử",
        "font_size_px": 16,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "cards": [
        {
          "title": "Năng lượng",
          "bounds_px": {
            "x": 38,
            "y": 1247,
            "width": 160,
            "height": 50
          },
          "icon": "battery",
          "text": "> 1 h hoạt động đầy đủ\n0,5 mA @ 12 V\nngủ sâu"
        },
        {
          "title": "Lưu đệm dữ liệu",
          "bounds_px": {
            "x": 215,
            "y": 1247,
            "width": 160,
            "height": 50
          },
          "icon": "SD card",
          "text": "SD 1 GB ≈\n2097 152\nbản tin"
        },
        {
          "title": "Cập nhật từ xa (OTA)",
          "bounds_px": {
            "x": 395,
            "y": 1247,
            "width": 190,
            "height": 50
          },
          "icon": "cloud upload",
          "text": "Kích thước gói\nKB 72 KB\nThời gian cập nhật\n18 – 20 s"
        },
        {
          "title": "Kiểm thử hệ thống",
          "bounds_px": {
            "x": 608,
            "y": 1247,
            "width": 180,
            "height": 50
          },
          "icon": "orange users",
          "text": "50 thiết bị\nđồng thời\nTỉ lệ ổn định\n20 – 25%"
        },
        {
          "title": "Giao diện khai thác",
          "bounds_px": {
            "x": 808,
            "y": 1247,
            "width": 190,
            "height": 50
          },
          "icon": "monitor",
          "text": "Giao đồ, chi tiết thiết bị,\ntrạng thái, lịch sử\nvà cảnh báo"
        }
      ],
      "card_typography": {
        "title_font_size_px": 8.5,
        "body_font_size_px": 8.5,
        "line_height_px": 12,
        "text_align": "center"
      }
    },
    {
      "id": 7,
      "title": "7. Giá trị và khả năng mở rộng",
      "bounds_px": {
        "x": 18,
        "y": 1310,
        "width": 1019,
        "height": 85
      },
      "header": {
        "bounds_px": {
          "x": 23,
          "y": 1315,
          "width": 278,
          "height": 26
        },
        "background": "#003B8F",
        "text": "7. Giá trị và khả năng mở rộng",
        "font_size_px": 16,
        "font_weight": 700,
        "text_color": "#FFFFFF"
      },
      "items": [
        {
          "bounds_px": {
            "x": 38,
            "y": 1344,
            "width": 190,
            "height": 42
          },
          "icon": "puzzle piece",
          "icon_color": "#003B8F",
          "text": "Nguyên mẫu end-to-end\ntừ phần cứng đến\ndashboard."
        },
        {
          "bounds_px": {
            "x": 280,
            "y": 1344,
            "width": 190,
            "height": 42
          },
          "icon": "chip / OBD",
          "icon_color": "#003B8F",
          "text": "Giải pháp ít xâm lấn,\nđộ OBD-II\nqua BLE."
        },
        {
          "bounds_px": {
            "x": 520,
            "y": 1344,
            "width": 215,
            "height": 42
          },
          "icon": "battery",
          "icon_color": "#003B8F",
          "text": "Vận hành bền; ngủ sâu,\nlưu đệm khi mất sóng,\nOTA từ xa."
        },
        {
          "bounds_px": {
            "x": 780,
            "y": 1344,
            "width": 225,
            "height": 42
          },
          "icon": "bar chart",
          "icon_color": "#003B8F",
          "text": "Có thể mở rộng cho đội xe\nnhỏ và nhiều loại thiết bị\nphần mềm."
        }
      ],
      "typography": {
        "font_size_px": 9.5,
        "line_height_px": 13,
        "text_align": "center"
      }
    }
  ],
  "footer": {
    "bounds_px": {
      "x": 18,
      "y": 1402,
      "width": 1019,
      "height": 70
    },
    "background": "#003B8F",
    "border_radius_px": 7,
    "left_icon": {
      "type": "rocket outline",
      "bounds_px": {
        "x": 43,
        "y": 1415,
        "width": 44,
        "height": 44
      },
      "color": "#FFFFFF"
    },
    "right_icon": {
      "type": "cloud upload outline",
      "bounds_px": {
        "x": 980,
        "y": 1420,
        "width": 42,
        "height": 38
      },
      "color": "#FFFFFF"
    },
    "text": "Từ thiết bị trên xe đến dashboard quản lý, toàn bộ chuỗi được thiết kế và triển khai đồng bộ.",
    "typography": {
      "font_size_px": 20,
      "font_weight": 700,
      "line_height_px": 28,
      "color": "#FFFFFF",
      "text_align": "center",
      "bounds_px": {
        "x": 115,
        "y": 1420,
        "width": 820,
        "height": 38
      }
    }
  },
  "colors": {
    "navy": "#003B8F",
    "blue": "#0B4CA3",
    "light_blue": "#B9CAE9",
    "orange": "#F26A21",
    "green_nginx": "#148C40",
    "green_freertos": "#2FA43A",
    "red_espidf": "#E83323",
    "purple_victorialogs": "#6A22E8",
    "orange_victoriametrics": "#F26A21",
    "black_text": "#111111",
    "white": "#FFFFFF"
  },
  "text_inventory": {
    "removed_text": [
      "Nguyên mẫu end-to-end từ thiết bị trên xe đến nền tảng cloud và giao diện khai thác"
    ],
    "main_title": "THIẾT KẾ HỆ THỐNG IoT CHO ỨNG DỤNG\nQUẢN LÝ PHƯƠNG TIỆN GIAO THÔNG\nTRONG LĨNH VỰC CHO THUÊ XE TỰ LÁI",
    "student_info": {
      "Sinh viên": "Lê Trọng An",
      "MSSV": "21010389",
      "Lớp": "K15-KTCDT2",
      "GVHD": "TS. Nguyễn Đức Nam"
    },
    "section_titles": [
      "1. Giới thiệu",
      "2. Mục tiêu",
      "3. Kiến trúc hệ thống từ thiết bị đến dashboard",
      "4. Thiết kế và chế tạo thiết bị",
      "5. Triển khai phần mềm và máy chủ",
      "6. Kết quả triển khai và kiểm thử",
      "7. Giá trị và khả năng mở rộng"
    ],
    "footer": "Từ thiết bị trên xe đến dashboard quản lý, toàn bộ chuỗi được thiết kế và triển khai đồng bộ."
  },
  "export_recommendations": {
    "for_A0_print": {
      "recommended_pixel_size": {
        "width_px": 7016,
        "height_px": 9933,
        "dpi": 300
      },
      "safe_minimum_pixel_size": {
        "width_px": 3508,
        "height_px": 4967,
        "dpi": 150
      },
      "preferred_file_types": [
        "PDF vector",
        "SVG",
        "PNG 300 DPI"
      ]
    }
  }
}
```
