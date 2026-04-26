exports.getExternalJobs = async (req, res) => {
    try {
        const { keyword = "", location = "", remote = "" } = req.query;

        const response = await fetch("https://www.arbeitnow.com/api/job-board-api");
        const result = await response.json();
        let allJobs = result.data || [];

        allJobs = allJobs.filter((job) => {
            const title = (job.title || "").toLowerCase();
            const company = (job.company_name || "").toLowerCase();
            const jobLocation = (job.location || "").toLowerCase();
            const tags = Array.isArray(job.tags) ? job.tags.join(" ").toLowerCase() : "";

            const matchKeyword =
                !keyword ||
                title.includes(keyword.toLowerCase()) ||
                company.includes(keyword.toLowerCase()) ||
                tags.includes(keyword.toLowerCase());

            const matchLocation =
                !location || jobLocation.includes(location.toLowerCase());

            const matchRemote =
                !remote ||
                (remote === "remote" && job.remote === true) ||
                (remote === "onsite" && job.remote === false);

            return matchKeyword && matchLocation && matchRemote;
        });

        res.render("student-external-jobs", {
            title: "Job Opportunities",
            jobs: allJobs,
            filters: { keyword, location, remote },
            currentPage: "jobs",
            currentCompany: req.session?.company || null
        });

    } catch (error) {
        console.error("Error in getExternalJobs:", error);
        req.flash("error_msg", "Failed to load job listings.");
        res.redirect("/");
    }
};