// "About this program" text for services whose source record has no description.
// These are generated from the record's name, type, and languages only; they describe
// the kind of program in general terms and point to the provider for specifics.
// They are NOT verified program details, so review before relying on them.
interface DescribableService { name: string; type: string; description: string | null; languages: string }

function languageNote(languages: string) {
  const text = languages.toLowerCase();
  if (text.includes("spanish only")) return " Services are offered in Spanish.";
  if (text.includes("spanish")) return " Services are offered in English and Spanish.";
  return "";
}

export function describeService(service: DescribableService): string | null {
  if (service.description?.trim()) return service.description;
  const { name, type } = service;
  const note = languageNote(service.languages);
  const confirm = "Contact the program to confirm hours, what is available, and who is eligible.";
  let text: string;
  if (/library/i.test(name)) text = "Public library branch open to Clark County residents. Offers public computers and internet access. Contact the branch for hours and device availability.";
  else if (/goodwill/i.test(name)) text = "Goodwill career center that supports job seekers, including access to computers for job searching. " + confirm;
  else if (/senior/i.test(name)) text = "Senior facility listed as a computer and device access resource for its community. " + confirm;
  else if (/resource center/i.test(name)) text = "Community resource center listed as a computer and device access resource. " + confirm;
  else if (/workforce/i.test(type)) text = `${name} offers workforce programming in Southern Nevada, which can include help with computers, job applications, and job-search skills. ` + confirm;
  else if (/device/i.test(type)) text = `${name} is listed as a device or computer access resource. ` + confirm;
  else if (/skills/i.test(type)) text = `${name} is listed as a digital skills training resource. ` + confirm;
  else if (/afford|connect/i.test(type)) text = `${name} is listed as an internet affordability or connectivity resource. ` + confirm;
  else text = `${name} is listed as a digital inclusion resource. ` + confirm;
  return text + note;
}
