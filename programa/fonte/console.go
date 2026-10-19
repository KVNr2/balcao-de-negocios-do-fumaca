package main

import (
	"os"
	"syscall"
	"unsafe"
)

// Esconde (ou mostra) a janela preta do programa.
func showConsole(show bool) {
	k := syscall.NewLazyDLL("kernel32.dll")
	u := syscall.NewLazyDLL("user32.dll")
	h, _, _ := k.NewProc("GetConsoleWindow").Call()
	if h == 0 {
		return
	}
	cmd := uintptr(0) // SW_HIDE
	if show {
		cmd = 5 // SW_SHOW
	}
	u.NewProc("ShowWindow").Call(h, cmd)
}

// Mostra um erro numa caixa de mensagem (o programa não tem janela preta, então o console não serviria).
func fatalBox(msg string) {
	stopTray()
	u := syscall.NewLazyDLL("user32.dll")
	t, _ := syscall.UTF16PtrFromString("Ficha do Albion")
	m, _ := syscall.UTF16PtrFromString(msg)
	u.NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
	os.Exit(1)
}

func infoBox(msg string) {
	u := syscall.NewLazyDLL("user32.dll")
	t, _ := syscall.UTF16PtrFromString("Ficha do Albion")
	m, _ := syscall.UTF16PtrFromString(msg)
	u.NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x40)
}
