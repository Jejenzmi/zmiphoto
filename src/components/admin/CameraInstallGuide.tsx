import { useState } from "react";
import {
  Camera, Monitor, Usb, Download, Terminal, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight, Copy, ExternalLink,
  Laptop, Server, Wifi, Zap, HardDrive, Cable
} from "lucide-react";
import { toast } from "sonner";

type OS = "windows" | "linux";

const steps = {
  windows: [
    {
      title: "Install digiCamControl",
      icon: Download,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            digiCamControl adalah software gratis untuk mengontrol kamera Canon dari PC Windows.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Download dari <a href="http://digicamcontrol.com/download" target="_blank" rel="noopener" className="text-primary underline">digicamcontrol.com/download</a></li>
            <li>Install seperti biasa (Next → Next → Finish)</li>
            <li>Buka digiCamControl, pastikan bisa mendeteksi kamera</li>
            <li>Biarkan digiCamControl berjalan di background</li>
          </ol>
        </>
      ),
    },
    {
      title: "Install Node.js",
      icon: Server,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Node.js diperlukan untuk menjalankan bridge server.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Download Node.js v18+ dari <a href="https://nodejs.org/" target="_blank" rel="noopener" className="text-primary underline">nodejs.org</a></li>
            <li>Install dengan opsi default</li>
            <li>Verifikasi: buka Command Prompt, ketik <code className="bg-muted px-1.5 py-0.5 rounded text-xs">node --version</code></li>
          </ol>
        </>
      ),
    },
    {
      title: "Hubungkan Kamera via USB",
      icon: Cable,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Hubungkan kamera Canon ke PC menggunakan kabel USB.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Nyalakan kamera Canon (EOS 1200D / 1300D / lainnya)</li>
            <li>Set mode dial ke <strong>M</strong> (Manual) atau <strong>P</strong> (Program)</li>
            <li>Hubungkan kabel USB dari kamera ke PC</li>
            <li>Pastikan digiCamControl menampilkan nama kamera</li>
          </ol>
          <div className="mt-2 p-2 bg-accent/50 rounded text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>Pastikan USB mode kamera di <strong>PTP/MTP</strong>, bukan Mass Storage. Cek di menu kamera → Settings → USB Connection.</span>
          </div>
        </>
      ),
    },
    {
      title: "Jalankan Camera Bridge",
      icon: Terminal,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Jalankan script bridge untuk menghubungkan kamera ke web app.
          </p>
          <CommandBlock commands={[
            "cd camera-bridge",
            "npm install",
            "node bridge-auto.js",
          ]} />
          <p className="text-xs text-muted-foreground mt-2">
            Bridge akan otomatis mendeteksi OS dan kamera. Server berjalan di <code className="bg-muted px-1 py-0.5 rounded">http://localhost:8080</code>
          </p>
        </>
      ),
    },
    {
      title: "Verifikasi Koneksi",
      icon: CheckCircle2,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Pastikan kamera terdeteksi oleh sistem.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Buka browser, akses <code className="bg-muted px-1.5 py-0.5 rounded text-xs">http://localhost:8080/status</code></li>
            <li>Harus muncul: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{`{"connected": true, "camera": {...}}`}</code></li>
            <li>Buka halaman Kiosk — akan muncul notifikasi "📷 Canon DSLR terdeteksi!"</li>
            <li>Test capture di <code className="bg-muted px-1.5 py-0.5 rounded text-xs">http://localhost:8080/capture</code> (POST)</li>
          </ol>
        </>
      ),
    },
  ],
  linux: [
    {
      title: "Install gPhoto2",
      icon: Download,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            gPhoto2 adalah tool open-source untuk mengontrol kamera digital di Linux.
          </p>
          <CommandBlock commands={[
            "sudo apt-get update",
            "sudo apt-get install gphoto2 libgphoto2-dev",
          ]} />
        </>
      ),
    },
    {
      title: "Install Node.js",
      icon: Server,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Install Node.js v18+ menggunakan NodeSource.
          </p>
          <CommandBlock commands={[
            "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
            "sudo apt-get install -y nodejs",
            "node --version",
          ]} />
        </>
      ),
    },
    {
      title: "Hubungkan Kamera via USB",
      icon: Cable,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Hubungkan kamera Canon dan pastikan terdeteksi.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Nyalakan kamera Canon, set ke mode <strong>M</strong> atau <strong>P</strong></li>
            <li>Hubungkan USB ke PC</li>
            <li>Verifikasi deteksi:</li>
          </ol>
          <CommandBlock commands={["gphoto2 --auto-detect"]} />
          <div className="mt-2 p-2 bg-accent/50 rounded text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p>Jika permission denied, jalankan:</p>
              <code className="bg-muted px-1 py-0.5 rounded">sudo chmod a+rw /dev/bus/usb/XXX/YYY</code>
              <p className="mt-1">Atau tambahkan udev rules untuk akses permanen.</p>
            </div>
          </div>
        </>
      ),
    },
    {
      title: "Jalankan Camera Bridge",
      icon: Terminal,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Jalankan script bridge.
          </p>
          <CommandBlock commands={[
            "cd camera-bridge",
            "npm install",
            "node bridge-auto.js",
          ]} />
          <p className="text-xs text-muted-foreground mt-2">
            Server akan berjalan di <code className="bg-muted px-1 py-0.5 rounded">http://localhost:8080</code>
          </p>
        </>
      ),
    },
    {
      title: "Verifikasi Koneksi",
      icon: CheckCircle2,
      content: (
        <>
          <p className="text-sm text-muted-foreground mb-2">
            Test koneksi kamera.
          </p>
          <CommandBlock commands={[
            "curl http://localhost:8080/status",
            '# Harus return: {"connected": true, ...}',
            "",
            "curl -X POST http://localhost:8080/capture",
            "# Test foto — hasilnya base64 JPEG",
          ]} />
          <p className="text-sm text-muted-foreground mt-2">
            Buka halaman Kiosk di browser — akan muncul notifikasi "📷 Canon DSLR terdeteksi!"
          </p>
        </>
      ),
    },
  ],
};

const troubleshooting = [
  {
    problem: "Kamera tidak terdeteksi",
    solutions: [
      "Pastikan USB mode kamera di PTP/MTP (bukan Mass Storage)",
      "Coba kabel USB lain — beberapa kabel hanya support charging",
      "Restart kamera dan cabut-pasang USB",
      "Windows: Pastikan digiCamControl berjalan sebelum bridge",
      "Linux: Jalankan gphoto2 --auto-detect untuk cek",
    ],
  },
  {
    problem: "Bridge server error / port in use",
    solutions: [
      "Pastikan tidak ada proses lain di port 8080",
      "Windows: netstat -ano | findstr :8080",
      "Linux: lsof -i :8080 lalu kill prosesnya",
      "Ubah port di file .env camera-bridge",
    ],
  },
  {
    problem: "Foto terlalu gelap / terang",
    solutions: [
      "Set kamera ke mode Manual (M)",
      "Atur ISO: 400–800 untuk indoor, 100–200 untuk outdoor",
      "Atur shutter speed: 1/125 untuk indoor dengan flash",
      "Gunakan external flash/continuous light untuk hasil terbaik",
    ],
  },
  {
    problem: "Live preview lambat / lag",
    solutions: [
      "Pastikan USB 2.0/3.0 terhubung langsung (bukan hub)",
      "Tutup aplikasi lain yang mengakses kamera",
      "Kurangi resolusi preview di bridge settings",
    ],
  },
];

const compatibleCameras = [
  { name: "Canon EOS 1200D", status: "tested", note: "Fully tested" },
  { name: "Canon EOS 1300D", status: "tested", note: "Fully tested" },
  { name: "Canon EOS 2000D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS 4000D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS 200D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS 250D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS 750D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS 80D", status: "compatible", note: "Compatible" },
  { name: "Canon EOS R50", status: "compatible", note: "Via USB" },
  { name: "Nikon D3400", status: "compatible", note: "Via gPhoto2 (Linux)" },
  { name: "USB Webcam (Logitech, dll)", status: "fallback", note: "Auto-fallback" },
];

function CommandBlock({ commands }: { commands: string[] }) {
  const text = commands.join("\n");
  const copy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };
  return (
    <div className="relative mt-2 bg-card border rounded-lg overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
        title="Copy"
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <pre className="p-3 text-xs font-mono overflow-x-auto text-foreground">
        {commands.map((cmd, i) => (
          <div key={i} className={cmd.startsWith("#") ? "text-muted-foreground" : ""}>
            {cmd.startsWith("#") ? cmd : cmd ? `$ ${cmd}` : ""}
          </div>
        ))}
      </pre>
    </div>
  );
}

const CameraInstallGuide = () => {
  const [selectedOS, setSelectedOS] = useState<OS>("windows");
  const [expandedStep, setExpandedStep] = useState<number>(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showCompatibility, setShowCompatibility] = useState(false);

  const currentSteps = steps[selectedOS];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Panduan Instalasi Kamera</h2>
          <p className="text-sm text-muted-foreground">Setup Canon DSLR untuk ZMI Photobox Kiosk</p>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="p-4 bg-card border rounded-lg">
        <p className="text-xs font-medium text-muted-foreground mb-3">ARSITEKTUR KONEKSI</p>
        <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <Monitor className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Browser (Kiosk UI)</span>
          </div>
          <div className="flex flex-col items-center text-muted-foreground">
            <Wifi className="w-4 h-4" />
            <span className="text-[10px]">HTTP :8080</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-accent rounded-lg border">
            <Server className="w-4 h-4 text-foreground" />
            <span className="font-medium text-foreground">Camera Bridge</span>
          </div>
          <div className="flex flex-col items-center text-muted-foreground">
            <Usb className="w-4 h-4" />
            <span className="text-[10px]">USB</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-accent rounded-lg border">
            <Camera className="w-4 h-4 text-foreground" />
            <span className="font-medium text-foreground">Canon DSLR</span>
          </div>
        </div>
      </div>

      {/* OS Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSelectedOS("windows"); setExpandedStep(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            selectedOS === "windows"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-accent"
          }`}
        >
          <Laptop className="w-4 h-4" />
          Windows
        </button>
        <button
          onClick={() => { setSelectedOS("linux"); setExpandedStep(0); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            selectedOS === "linux"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border hover:bg-accent"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Linux
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {currentSteps.map((step, i) => {
          const Icon = step.icon;
          const isExpanded = expandedStep === i;
          return (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedStep(isExpanded ? -1 : i)}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isExpanded ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <Icon className={`w-4 h-4 shrink-0 ${isExpanded ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm text-foreground flex-1">{step.title}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 ml-10 border-t">
                  {step.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compatible Cameras */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCompatibility(!showCompatibility)}
          className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors text-left"
        >
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm text-foreground flex-1">Kamera yang Kompatibel</span>
          {showCompatibility ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showCompatibility && (
          <div className="px-4 pb-4 border-t">
            <div className="mt-3 space-y-1.5">
              {compatibleCameras.map((cam, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-accent/30">
                  <span className="text-foreground">{cam.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cam.status === "tested"
                      ? "bg-green-500/10 text-green-600"
                      : cam.status === "compatible"
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {cam.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors text-left"
        >
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="font-medium text-sm text-foreground flex-1">Troubleshooting</span>
          {showTroubleshooting ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showTroubleshooting && (
          <div className="px-4 pb-4 border-t">
            <div className="mt-3 space-y-4">
              {troubleshooting.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-foreground mb-1.5">❌ {item.problem}</p>
                  <ul className="space-y-1 ml-4">
                    {item.solutions.map((sol, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-primary">•</span>
                        {sol}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick API Reference */}
      <div className="p-4 bg-card border rounded-lg">
        <p className="text-xs font-medium text-muted-foreground mb-3">API REFERENCE — BRIDGE ENDPOINTS</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Method</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Endpoint</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Deskripsi</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-dashed">
                <td className="py-2"><code className="bg-green-500/10 text-green-600 px-1.5 rounded">GET</code></td>
                <td className="py-2 font-mono">/status</td>
                <td className="py-2 text-muted-foreground">Cek status koneksi kamera</td>
              </tr>
              <tr className="border-b border-dashed">
                <td className="py-2"><code className="bg-blue-500/10 text-blue-600 px-1.5 rounded">POST</code></td>
                <td className="py-2 font-mono">/capture</td>
                <td className="py-2 text-muted-foreground">Ambil foto, return base64 JPEG</td>
              </tr>
              <tr className="border-b border-dashed">
                <td className="py-2"><code className="bg-green-500/10 text-green-600 px-1.5 rounded">GET</code></td>
                <td className="py-2 font-mono">/preview</td>
                <td className="py-2 text-muted-foreground">Live view frame (JPEG)</td>
              </tr>
              <tr>
                <td className="py-2"><code className="bg-blue-500/10 text-blue-600 px-1.5 rounded">POST</code></td>
                <td className="py-2 font-mono">/settings</td>
                <td className="py-2 text-muted-foreground">Ubah ISO, shutter speed, aperture</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CameraInstallGuide;
