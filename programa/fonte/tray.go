package main

import (
	_ "embed"
	"os"
	"runtime"
	"syscall"
	"unsafe"
)

//go:embed icons/icon16.png
var icon16 []byte

//go:embed icons/icon24.png
var icon24 []byte

//go:embed icons/icon32.png
var icon32 []byte

//go:embed icons/icon48.png
var icon48 []byte

// Ícone na bandeja do Windows (ao lado do relógio) enquanto o programa espera você entrar no jogo.
// Só Win32 via syscall, sem biblioteca externa.
var (
	user32  = syscall.NewLazyDLL("user32.dll")
	shell32 = syscall.NewLazyDLL("shell32.dll")
	kern32  = syscall.NewLazyDLL("kernel32.dll")

	pRegisterClassEx   = user32.NewProc("RegisterClassExW")
	pCreateWindowEx    = user32.NewProc("CreateWindowExW")
	pDefWindowProc     = user32.NewProc("DefWindowProcW")
	pGetMessage        = user32.NewProc("GetMessageW")
	pTranslateMessage  = user32.NewProc("TranslateMessage")
	pDispatchMessage   = user32.NewProc("DispatchMessageW")
	pPostQuitMessage   = user32.NewProc("PostQuitMessage")
	pCreatePopupMenu   = user32.NewProc("CreatePopupMenu")
	pAppendMenu        = user32.NewProc("AppendMenuW")
	pTrackPopupMenu    = user32.NewProc("TrackPopupMenu")
	pDestroyMenu       = user32.NewProc("DestroyMenu")
	pSetForegroundWin  = user32.NewProc("SetForegroundWindow")
	pGetCursorPos      = user32.NewProc("GetCursorPos")
	pCreateIconFromRes = user32.NewProc("CreateIconFromResourceEx")
	pGetSystemMetrics  = user32.NewProc("GetSystemMetrics")
	pShellNotifyIcon   = shell32.NewProc("Shell_NotifyIconW")
	pGetModuleHandle   = kern32.NewProc("GetModuleHandleW")
)

const (
	wmUser         = 0x0400
	wmTray         = wmUser + 1
	wmLButtonUp    = 0x0202
	wmRButtonUp    = 0x0205
	wmDestroy      = 0x0002
	nimAdd         = 0
	nimModify      = 1
	nimDelete      = 2
	nifMessage     = 0x1
	nifIcon        = 0x2
	nifTip         = 0x4
	nifInfo        = 0x10
	mfString       = 0x0
	mfGrayed       = 0x1
	tpmReturnCmd   = 0x100
	tpmRightButton = 0x2
	idCancel       = 1
	hwndMessage    = ^uintptr(2) // HWND_MESSAGE = (HWND)-3
)

type notifyIconData struct {
	CbSize           uint32
	HWnd             uintptr
	UID              uint32
	UFlags           uint32
	UCallbackMessage uint32
	HIcon            uintptr
	SzTip            [128]uint16
	DwState          uint32
	DwStateMask      uint32
	SzInfo           [256]uint16
	UVersion         uint32
	SzInfoTitle      [64]uint16
	DwInfoFlags      uint32
	GuidItem         [16]byte
	HBalloonIcon     uintptr
}

type wndClassEx struct {
	CbSize        uint32
	Style         uint32
	LpfnWndProc   uintptr
	CbClsExtra    int32
	CbWndExtra    int32
	HInstance     uintptr
	HIcon         uintptr
	HCursor       uintptr
	HbrBackground uintptr
	LpszMenuName  *uint16
	LpszClassName *uint16
	HIconSm       uintptr
}

type point struct{ X, Y int32 }
type msg struct {
	HWnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      point
}

type trayT struct {
	hwnd  uintptr
	icon  uintptr
	ready chan struct{}
	tip   string
	menu  string // texto do item de status (cinza)
}

var tray = &trayT{ready: make(chan struct{})}

func u16(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func copyU16(dst []uint16, s string) {
	w, _ := syscall.UTF16FromString(s)
	if len(w) > len(dst) {
		w = w[:len(dst)]
		w[len(w)-1] = 0
	}
	copy(dst, w)
}

func loadTrayIcon() uintptr {
	sz, _, _ := pGetSystemMetrics.Call(49) // SM_CXSMICON
	data := icon32
	px := 32
	switch {
	case sz <= 16:
		data, px = icon16, 16
	case sz <= 24:
		data, px = icon24, 24
	case sz <= 32:
		data, px = icon32, 32
	default:
		data, px = icon48, 48
	}
	h, _, _ := pCreateIconFromRes.Call(uintptr(unsafe.Pointer(&data[0])), uintptr(len(data)), 1, 0x00030000, uintptr(px), uintptr(px), 0)
	return h
}

func (t *trayT) nid(flags uint32) *notifyIconData {
	n := &notifyIconData{HWnd: t.hwnd, UID: 1, UFlags: flags, UCallbackMessage: wmTray, HIcon: t.icon}
	n.CbSize = uint32(unsafe.Sizeof(*n))
	copyU16(n.SzTip[:], t.tip)
	return n
}

// startTray cria o ícone. tip: texto ao passar o mouse; status: linha cinza do menu.
func startTray(tip, status string) {
	tray.tip, tray.menu = tip, status
	go func() {
		runtime.LockOSThread()
		hinst, _, _ := pGetModuleHandle.Call(0)
		cls := u16("FichaAlbionTray")
		wp := syscall.NewCallback(func(hwnd, m, wparam, lparam uintptr) uintptr {
			switch m {
			case wmTray:
				if uint32(lparam) == wmRButtonUp || uint32(lparam) == wmLButtonUp {
					showTrayMenu(hwnd)
				}
				return 0
			case wmDestroy:
				pPostQuitMessage.Call(0)
				return 0
			}
			r, _, _ := pDefWindowProc.Call(hwnd, m, wparam, lparam)
			return r
		})
		wc := wndClassEx{LpfnWndProc: wp, HInstance: hinst, LpszClassName: cls}
		wc.CbSize = uint32(unsafe.Sizeof(wc))
		pRegisterClassEx.Call(uintptr(unsafe.Pointer(&wc)))
		title := u16("Ficha do Albion")
		hwnd, _, _ := pCreateWindowEx.Call(0, uintptr(unsafe.Pointer(cls)), uintptr(unsafe.Pointer(title)), 0, 0, 0, 0, 0, hwndMessage, 0, hinst, 0)
		runtime.KeepAlive(title)
		if hwnd == 0 {
			close(tray.ready)
			return
		}
		tray.hwnd = hwnd
		tray.icon = loadTrayIcon()
		pShellNotifyIcon.Call(nimAdd, uintptr(unsafe.Pointer(tray.nid(nifMessage|nifIcon|nifTip))))
		close(tray.ready)
		var m msg
		for {
			r, _, _ := pGetMessage.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
			if int32(r) <= 0 {
				return
			}
			pTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
			pDispatchMessage.Call(uintptr(unsafe.Pointer(&m)))
		}
	}()
	<-tray.ready
}

func showTrayMenu(hwnd uintptr) {
	menu, _, _ := pCreatePopupMenu.Call()
	st, cancel := u16(tray.menu), u16("Cancelar e sair")
	pAppendMenu.Call(menu, mfString|mfGrayed, 0, uintptr(unsafe.Pointer(st)))
	pAppendMenu.Call(menu, mfString, idCancel, uintptr(unsafe.Pointer(cancel)))
	runtime.KeepAlive(st)
	runtime.KeepAlive(cancel)
	var p point
	pGetCursorPos.Call(uintptr(unsafe.Pointer(&p)))
	pSetForegroundWin.Call(hwnd)
	cmd, _, _ := pTrackPopupMenu.Call(menu, tpmReturnCmd|tpmRightButton, uintptr(p.X), uintptr(p.Y), 0, hwnd, 0)
	pDestroyMenu.Call(menu)
	if cmd == idCancel {
		stopTray()
		exitNow(0)
	}
}

// setTray muda o texto do ícone e da linha de status do menu.
func setTray(tip, status string) {
	if tray.hwnd == 0 {
		return
	}
	tray.tip, tray.menu = tip, status
	pShellNotifyIcon.Call(nimModify, uintptr(unsafe.Pointer(tray.nid(nifTip))))
}

// balloonTray mostra um aviso do Windows junto do ícone.
func balloonTray(title, text string) {
	if tray.hwnd == 0 {
		return
	}
	n := tray.nid(nifInfo)
	copyU16(n.SzInfoTitle[:], title)
	copyU16(n.SzInfo[:], text)
	n.DwInfoFlags = 1 // NIIF_INFO
	pShellNotifyIcon.Call(nimModify, uintptr(unsafe.Pointer(n)))
}

func stopTray() {
	if tray.hwnd == 0 {
		return
	}
	pShellNotifyIcon.Call(nimDelete, uintptr(unsafe.Pointer(tray.nid(0))))
}

func exitNow(code int) {
	stopTray()
	os.Exit(code)
}
