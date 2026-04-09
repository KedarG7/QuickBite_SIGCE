function confirmDanger(message) {
  return window.confirm(message);
}

document.addEventListener("submit", (e) => {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.confirmDanger === "true") {
    const ok = confirmDanger(form.dataset.confirmMessage || "Are you sure?");
    if (!ok) e.preventDefault();
  }
});

