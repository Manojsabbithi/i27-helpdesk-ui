import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import api from "@/lib/api";
import CreateTicketPage from "@/app/student/tickets/create/page";
import StudentTicketDetailsPage from "@/app/student/tickets/[id]/page";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "3" }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock(
  "@/components/layout/DashboardLayout",
  () =>
    function MockDashboardLayout({ children }: any) {
      return <div>{children}</div>;
    }
);

jest.mock(
  "@/components/ui/StatusBadge",
  () =>
    function MockStatusBadge({ status }: any) {
      return <span>{status}</span>;
    }
);

jest.mock(
  "@/components/ui/PriorityBadge",
  () =>
    function MockPriorityBadge({ priority }: any) {
      return <span>{priority}</span>;
    }
);

jest.mock("@/components/ui/LoadingSkeleton", () => ({
  SkeletonBlock: () => <div>Loading...</div>,
}));

const mockGet = api.get as unknown as jest.Mock;
const mockPost = api.post as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  localStorage.clear();
  localStorage.setItem("token", "test-token");
  localStorage.setItem(
    "user",
    JSON.stringify({
      userId: 7,
      roles: ["USER"],
      fullName: "AWS Demo Student",
    })
  );

  Object.defineProperty(window.URL, "createObjectURL", {
    writable: true,
    value: jest.fn(() => "blob:test-download"),
  });

  Object.defineProperty(window.URL, "revokeObjectURL", {
    writable: true,
    value: jest.fn(),
  });

  jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("uploads an attachment after creating a ticket", async () => {
  const user = userEvent.setup();

  mockPost
    .mockResolvedValueOnce({
      data: {
        id: 3,
      },
    })
    .mockResolvedValueOnce({
      data: {
        id: "attachment-1",
      },
    });

  render(<CreateTicketPage />);

  await user.type(
    screen.getByPlaceholderText("Brief summary of the issue"),
    "Attachment test"
  );

  await user.type(
    screen.getByPlaceholderText("Describe the problem in detail..."),
    "Testing ticket attachment upload"
  );

  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  expect(fileInput).not.toBeNull();

  const file = new File(
    ["hello from browser"],
    "proof.txt",
    {
      type: "text/plain",
    }
  );

  await user.upload(fileInput, file);

  await user.click(
    screen.getByRole("button", {
      name: /create ticket/i,
    })
  );

  await waitFor(() => {
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  expect(mockPost.mock.calls[0]).toEqual([
    "/tickets",
    expect.objectContaining({
      title: "Attachment test",
      description: "Testing ticket attachment upload",
    }),
  ]);

  expect(mockPost.mock.calls[1][0]).toBe("/attachments");

  const formData = mockPost.mock.calls[1][1] as FormData;

  expect(formData.get("ticketId")).toBe("3");

  const uploadedFile = formData.get("file") as File;

  expect(uploadedFile.name).toBe("proof.txt");

  expect(mockPush).toHaveBeenCalledWith(
    "/student/dashboard?created=true"
  );
});

test("lists ticket attachments and downloads one", async () => {
  const user = userEvent.setup();

  mockGet.mockImplementation((url: string) => {
    if (url === "/tickets/3") {
      return Promise.resolve({
        data: {
          id: 3,
          title: "Browser S3 Attachment Test",
          description: "Attachment test",
          status: "CLOSED",
          priority: "MEDIUM",
          assignedTo: 6,
        },
      });
    }

    if (url === "/auth/users/6") {
      return Promise.resolve({
        data: {
          id: 6,
          fullName: "AWS Demo Agent",
        },
      });
    }

    if (url === "/comments/3") {
      return Promise.resolve({
        data: [],
      });
    }

    if (url === "/attachments") {
      return Promise.resolve({
        data: [
          {
            id: "attachment-1",
            fileName: "i27-ui-s3-test.txt",
            contentType: "text/plain",
            size: 51,
            ticketId: 3,
          },
          {
            id: "attachment-2",
            fileName: "two-kb.txt",
            contentType: "text/plain",
            size: 2048,
            ticketId: 3,
          },
          {
            id: "attachment-3",
            fileName: "two-mb.txt",
            contentType: "text/plain",
            size: 2 * 1024 * 1024,
            ticketId: 3,
          },
        ],
      });
    }

    if (url === "/attachments/attachment-1") {
      return Promise.resolve({
        data: new Blob(
          ["Uploaded from i27 Helpdesk"],
          {
            type: "text/plain",
          }
        ),
      });
    }

    return Promise.resolve({
      data: {},
    });
  });

  render(<StudentTicketDetailsPage />);

  expect(
    await screen.findByText("i27-ui-s3-test.txt")
  ).toBeInTheDocument();

  expect(screen.getByText(/51 B/)).toBeInTheDocument();
  expect(screen.getByText(/2.0 KB/)).toBeInTheDocument();
  expect(screen.getByText(/2.0 MB/)).toBeInTheDocument();

  expect(mockGet).toHaveBeenCalledWith(
    "/attachments",
    {
      params: {
        ticketId: 3,
      },
    }
  );

  const downloadButtons = screen.getAllByRole(
    "button",
    {
      name: /download/i,
    }
  );

  await user.click(downloadButtons[0]);

  await waitFor(() => {
    expect(mockGet).toHaveBeenCalledWith(
      "/attachments/attachment-1",
      {
        responseType: "blob",
      }
    );
  });

  expect(window.URL.createObjectURL).toHaveBeenCalled();
  expect(window.URL.revokeObjectURL).toHaveBeenCalled();
});

test("rejects an attachment larger than 10 MB", async () => {
  const user = userEvent.setup();

  render(<CreateTicketPage />);

  await user.type(
    screen.getByPlaceholderText("Brief summary of the issue"),
    "Large attachment test"
  );

  await user.type(
    screen.getByPlaceholderText("Describe the problem in detail..."),
    "Testing attachment size validation"
  );

  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  const largeFile = new File(
    [new Uint8Array(10 * 1024 * 1024 + 1)],
    "too-large.bin",
    {
      type: "application/octet-stream",
    }
  );

  await user.upload(fileInput, largeFile);

  await user.click(
    screen.getByRole("button", {
      name: /create ticket/i,
    })
  );

  expect(
    await screen.findByText("Attachment must be 10 MB or smaller")
  ).toBeInTheDocument();

  expect(mockPost).not.toHaveBeenCalled();
});


test("shows an error when attachment listing fails", async () => {
  mockGet.mockImplementation((url: string) => {
    if (url === "/tickets/3") {
      return Promise.resolve({
        data: {
          id: 3,
          title: "Attachment Test",
          description: "Testing",
          status: "OPEN",
          priority: "MEDIUM",
          assignedTo: null,
        },
      });
    }

    if (url === "/comments/3") {
      return Promise.resolve({
        data: [],
      });
    }

    if (url === "/attachments") {
      return Promise.reject(
        new Error("Attachment service unavailable")
      );
    }

    return Promise.resolve({
      data: {},
    });
  });

  render(<StudentTicketDetailsPage />);

  expect(
    await screen.findByText("Attachments unavailable")
  ).toBeInTheDocument();
});


test("shows no attachments message for an empty ticket", async () => {
  mockGet.mockImplementation((url: string) => {
    if (url === "/tickets/3") {
      return Promise.resolve({
        data: {
          id: 3,
          title: "Attachment Test",
          description: "Testing",
          status: "OPEN",
          priority: "MEDIUM",
          assignedTo: null,
        },
      });
    }

    if (url === "/comments/3") {
      return Promise.resolve({
        data: [],
      });
    }

    if (url === "/attachments") {
      return Promise.resolve({
        data: [],
      });
    }

    return Promise.resolve({
      data: {},
    });
  });

  render(<StudentTicketDetailsPage />);

  expect(
    await screen.findByText("No attachments for this ticket.")
  ).toBeInTheDocument();
});


test("shows an error when attachment download fails", async () => {
  const user = userEvent.setup();

  mockGet.mockImplementation((url: string) => {
    if (url === "/tickets/3") {
      return Promise.resolve({
        data: {
          id: 3,
          title: "Attachment Test",
          description: "Testing",
          status: "OPEN",
          priority: "MEDIUM",
          assignedTo: null,
        },
      });
    }

    if (url === "/comments/3") {
      return Promise.resolve({
        data: [],
      });
    }

    if (url === "/attachments") {
      return Promise.resolve({
        data: [
          {
            id: "failed-download",
            fileName: "failure.txt",
            contentType: "text/plain",
            size: 10,
            ticketId: 3,
          },
        ],
      });
    }

    if (url === "/attachments/failed-download") {
      return Promise.reject(
        new Error("Download failed")
      );
    }

    return Promise.resolve({
      data: {},
    });
  });

  render(<StudentTicketDetailsPage />);

  expect(
    await screen.findByText("failure.txt")
  ).toBeInTheDocument();

  await user.click(
    screen.getByRole("button", {
      name: /download/i,
    })
  );

  expect(
    await screen.findByText("Unable to download attachment")
  ).toBeInTheDocument();
});
