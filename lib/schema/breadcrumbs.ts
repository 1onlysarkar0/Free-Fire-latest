export function generateBreadcrumbs(pathname: string, siteUrl: string): object {
  const segments = pathname.split("/").filter(Boolean);
  
  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteUrl,
    },
  ];

  let currentPath = siteUrl;
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Format segment name nicely (e.g. how-to-join -> How To Join)
    const name = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    itemListElement.push({
      "@type": "ListItem",
      position: index + 2,
      name,
      item: currentPath,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}
